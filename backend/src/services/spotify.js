"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollSpotifyRecentlyPlayed = pollSpotifyRecentlyPlayed;
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../database"));
const encryption_1 = require("../utils/encryption");
const config_1 = __importDefault(require("../config"));
const SPOTIFY_API = 'https://api.spotify.com/v1';
async function refreshAccessToken(userId, refreshToken) {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);
        params.append('client_id', config_1.default.spotify.clientId);
        params.append('client_secret', config_1.default.spotify.clientSecret);
        const response = await axios_1.default.post('https://accounts.spotify.com/api/token', params);
        const { access_token, refresh_token } = response.data;
        const encryptedAccess = (0, encryption_1.encrypt)(access_token);
        // If a new refresh token is returned, update it too
        if (refresh_token) {
            const encryptedRefresh = (0, encryption_1.encrypt)(refresh_token);
            database_1.default.prepare('UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ? WHERE id = ?')
                .run(encryptedAccess, encryptedRefresh, userId);
        }
        else {
            database_1.default.prepare('UPDATE users SET spotify_access_token = ? WHERE id = ?')
                .run(encryptedAccess, userId);
        }
        return access_token;
    }
    catch (e) {
        console.error(`Failed to refresh token for user ${userId}`, e);
        return null;
    }
}
async function pollSpotifyRecentlyPlayed() {
    console.log('Starting Spotify Polling...');
    const users = database_1.default.prepare('SELECT id, spotify_access_token, spotify_refresh_token FROM users WHERE spotify_access_token IS NOT NULL').all();
    for (const user of users) {
        let accessToken = (0, encryption_1.decrypt)(user.spotify_access_token);
        const refreshToken = (0, encryption_1.decrypt)(user.spotify_refresh_token);
        try {
            await fetchRecentlyPlayed(user.id, accessToken);
        }
        catch (e) {
            if (e.response?.status === 401) {
                console.log(`Token expired for user ${user.id}, refreshing...`);
                const newToken = await refreshAccessToken(user.id, refreshToken);
                if (newToken) {
                    await fetchRecentlyPlayed(user.id, newToken);
                }
            }
            else {
                console.error(`Error polling for user ${user.id}:`, e.message);
            }
        }
    }
}
async function fetchRecentlyPlayed(userId, accessToken) {
    const response = await axios_1.default.get(`${SPOTIFY_API}/me/player/recently-played?limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const items = response.data.items;
    const insertTrack = database_1.default.prepare(`
        INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url)
        VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url)
        ON CONFLICT(vendor_id) DO UPDATE SET 
            image_url = excluded.image_url,
            title = excluded.title
        RETURNING id
    `);
    const insertHistory = database_1.default.prepare(`
        INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source)
        VALUES (@user_id, @track_id, @played_at, 'spotify')
    `);
    database_1.default.transaction(() => {
        for (const item of items) {
            const track = item.track;
            const playedAt = new Date(item.played_at).toISOString();
            const trackData = {
                vendor_id: `spotify:track:${track.id}`,
                title: track.name,
                artist: track.artists.map((a) => a.name).join(', '),
                album: track.album.name,
                duration_ms: track.duration_ms,
                image_url: track.album.images[0]?.url || null
            };
            const trackRow = insertTrack.get(trackData);
            // If INSERT OR IGNORE and no update happened, we might not get ID if it existed? 
            // Better-sqlite3 RETURNING works on conflict update too.
            // But if we need ID for existing track without update? 
            // Actually, ON CONFLICT DO UPDATE returns the id so it should be fine.
            // Wait, if no change, does it return? Yes.
            let trackId = trackRow?.id;
            if (!trackId) {
                // Fallback if not returned (should not happen with DO UPDATE)
                const existing = database_1.default.prepare('SELECT id FROM tracks WHERE vendor_id = ?').get(trackData.vendor_id);
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
//# sourceMappingURL=spotify.js.map