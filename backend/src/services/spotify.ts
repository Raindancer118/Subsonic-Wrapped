import axios from 'axios';
import db from '../database';
import { decrypt, encrypt } from '../utils/encryption';
import config from '../config';

const SPOTIFY_API = 'https://api.spotify.com/v1';

async function refreshAccessToken(userId: number, refreshToken: string): Promise<string | null> {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);
        params.append('client_id', config.spotify.clientId);
        params.append('client_secret', config.spotify.clientSecret);

        const response = await axios.post('https://accounts.spotify.com/api/token', params);
        const { access_token, refresh_token } = response.data;

        const encryptedAccess = encrypt(access_token);
        // If a new refresh token is returned, update it too
        if (refresh_token) {
            const encryptedRefresh = encrypt(refresh_token);
            db.prepare('UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ? WHERE id = ?')
                .run(encryptedAccess, encryptedRefresh, userId);
        } else {
            db.prepare('UPDATE users SET spotify_access_token = ? WHERE id = ?')
                .run(encryptedAccess, userId);
        }

        return access_token;
    } catch (e) {
        console.error(`Failed to refresh token for user ${userId}`, e);
        return null;
    }
}

export async function pollSpotifyRecentlyPlayed() {
    console.log('Starting Spotify Polling...');
    const users = db.prepare('SELECT id, spotify_access_token, spotify_refresh_token FROM users WHERE spotify_access_token IS NOT NULL').all() as any[];

    for (const user of users) {
        let accessToken = decrypt(user.spotify_access_token);
        const refreshToken = decrypt(user.spotify_refresh_token);

        try {
            await fetchRecentlyPlayed(user.id, accessToken);
        } catch (e: any) {
            if (e.response?.status === 401) {
                console.log(`Token expired for user ${user.id}, refreshing...`);
                const newToken = await refreshAccessToken(user.id, refreshToken);
                if (newToken) {
                    await fetchRecentlyPlayed(user.id, newToken);
                }
            } else {
                console.error(`Error polling for user ${user.id}:`, e.message);
            }
        }
    }
}

async function fetchRecentlyPlayed(userId: number, accessToken: string) {
    const response = await axios.get(`${SPOTIFY_API}/me/player/recently-played?limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    const items = response.data.items;
    const insertTrack = db.prepare(`
        INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url, raw_data)
        VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url, @raw_data)
        ON CONFLICT(vendor_id) DO UPDATE SET 
            image_url = excluded.image_url,
            title = excluded.title,
            raw_data = excluded.raw_data
        RETURNING id
    `);

    const insertHistory = db.prepare(`
        INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source)
        VALUES (@user_id, @track_id, @played_at, 'spotify')
    `);

    db.transaction(() => {
        for (const item of items) {
            const track = item.track;
            const playedAt = new Date(item.played_at).toISOString();

            const trackData = {
                vendor_id: `spotify:track:${track.id}`,
                title: track.name,
                artist: track.artists.map((a: any) => a.name).join(', '),
                album: track.album.name,
                duration_ms: track.duration_ms,
                image_url: track.album.images[0]?.url || null,
                raw_data: JSON.stringify(track)
            };

            const trackRow = insertTrack.get(trackData) as { id: number } | undefined;
            // If INSERT OR IGNORE and no update happened, we might not get ID if it existed? 
            // Better-sqlite3 RETURNING works on conflict update too.
            // But if we need ID for existing track without update? 
            // Actually, ON CONFLICT DO UPDATE returns the id so it should be fine.
            // Wait, if no change, does it return? Yes.

            let trackId = trackRow?.id;
            if (!trackId) {
                // Fallback if not returned (should not happen with DO UPDATE)
                const existing = db.prepare('SELECT id FROM tracks WHERE vendor_id = ?').get(trackData.vendor_id) as { id: number };
                trackId = existing.id;
            }

            insertHistory.run({
                user_id: userId,
                track_id: trackId,
                played_at: playedAt
            });
        }
    })();

    // console.log(`Polled ${items.length} tracks for user ${userId}`);
}
