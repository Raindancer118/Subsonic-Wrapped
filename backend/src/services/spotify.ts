import axios from 'axios';
import db from '../database';
import { decrypt, encrypt } from '../utils/encryption';
import config from '../config';

const SPOTIFY_API = 'https://api.spotify.com/v1';

// Client Credentials Token State
let clientAccessToken: string | null = null;
let clientTokenExpiresAt: number = 0;

export const getSpotifyClientToken = async (): Promise<string | null> => {
    if (clientAccessToken && Date.now() < clientTokenExpiresAt) {
        return clientAccessToken;
    }

    if (!config.spotify.clientId || !config.spotify.clientSecret) {
        // console.warn('Spotify Client ID or Secret not configured.');
        return null;
    }

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', config.spotify.clientId);
        params.append('client_secret', config.spotify.clientSecret);

        const res = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        clientAccessToken = res.data.access_token;
        const expiresIn = res.data.expires_in || 3600;
        clientTokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000;

        console.log('Got new Spotify Client Access Token');
        return clientAccessToken;
    } catch (e: any) {
        console.error('Failed to get Spotify Client Token:', e.message);
        return null;
    }
};

export const searchSpotifyTrack = async (artist: string, title: string) => {
    const token = await getSpotifyClientToken();
    if (!token) return null;

    try {
        // Sanitize query
        const qArtist = artist.replace(/[^\w\s]/gi, '');
        const qTitle = title.replace(/[^\w\s]/gi, '');

        const query = `track:${qTitle} artist:${qArtist}`;
        const res = await axios.get(`${SPOTIFY_API}/search`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                q: query,
                type: 'track',
                limit: 1
            }
        });

        if (res.data.tracks && res.data.tracks.items.length > 0) {
            return res.data.tracks.items[0];
        }
    } catch (e: any) {
        console.error(`Spotify Search Failed for ${artist} - ${title}:`, e.message);
    }
    return null;
};

const getArtistGenre = async (artistId: string) => {
    const token = await getSpotifyClientToken();
    if (!token) return null;
    try {
        const res = await axios.get(`${SPOTIFY_API}/artists/${artistId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.genres && res.data.genres.length > 0) {
            // Capitalize
            return res.data.genres[0].charAt(0).toUpperCase() + res.data.genres[0].slice(1);
        }
    } catch (e) { }
    return null;
};

export const enrichTrack = async (trackId: number, artist: string, title: string) => {
    try {
        const track = db.prepare('SELECT image_url, year, genre FROM tracks WHERE id = ?').get(trackId) as any;
        // If we have everything, skip
        if (track.image_url && track.year && track.genre) return;

        // If we are missing something, search
        console.log(`[Enricher] Searching Spotify for: ${artist} - ${title}`);
        const spotifyTrack = await searchSpotifyTrack(artist, title);

        if (spotifyTrack) {
            const imageUrl = track.image_url || spotifyTrack.album.images[0]?.url || null;

            let year = track.year;
            if (!year && spotifyTrack.album.release_date) {
                year = parseInt(spotifyTrack.album.release_date.split('-')[0]);
            }

            let genre = track.genre;
            if (!genre && spotifyTrack.artists.length > 0) {
                genre = await getArtistGenre(spotifyTrack.artists[0].id);
            }

            if (imageUrl !== track.image_url || year !== track.year || genre !== track.genre) {
                db.prepare(`
                    UPDATE tracks 
                    SET image_url = COALESCE(image_url, ?),
                        year = COALESCE(year, ?),
                        genre = COALESCE(genre, ?)
                    WHERE id = ?
                `).run(imageUrl, year, genre, trackId);
                console.log(`[Enricher] Updated track ${trackId} | Year: ${year}, Genre: ${genre}, Image: ${!!imageUrl}`);
            }
        }
    } catch (e) {
        console.error('[Enricher] Error:', e);
    }
};

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
