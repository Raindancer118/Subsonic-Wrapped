"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollSubsonicNowPlaying = pollSubsonicNowPlaying;
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../database"));
const encryption_1 = require("../utils/encryption");
const subsonic_1 = require("../utils/subsonic");
const crypto_1 = __importDefault(require("crypto"));
// State map to track playback for scrobbling
const userPlayerStats = new Map();
async function pollSubsonicNowPlaying() {
    const users = database_1.default.prepare('SELECT id, username, subsonic_url, subsonic_auth FROM users WHERE subsonic_url IS NOT NULL').all();
    for (const user of users) {
        if (!user.subsonic_auth)
            continue;
        try {
            const authData = JSON.parse(user.subsonic_auth);
            const password = (0, encryption_1.decrypt)(authData.password || '');
            if (!password)
                continue;
            const salt = crypto_1.default.randomBytes(6).toString('hex');
            const token = crypto_1.default.createHash('md5').update(password + salt).digest('hex');
            const baseURL = user.subsonic_url.endsWith('/') ? user.subsonic_url.slice(0, -1) : user.subsonic_url;
            const subUser = authData.subsonicUser || user.username;
            const params = (0, subsonic_1.createAuthParams)(subUser, token, salt);
            const response = await axios_1.default.get(`${baseURL}/rest/getNowPlaying.view?${params}`);
            const nowPlaying = response.data['subsonic-response']?.nowPlaying?.entry;
            if (nowPlaying) {
                const entries = Array.isArray(nowPlaying) ? nowPlaying : [nowPlaying];
                const entry = entries.find((e) => e.username === subUser);
                if (entry) {
                    const trackData = {
                        vendor_id: `subsonic:track:${entry.id}`,
                        title: entry.title,
                        artist: entry.artist,
                        album: entry.album,
                        duration_ms: entry.duration ? entry.duration * 1000 : 0,
                        image_url: entry.coverArt ? `${baseURL}/rest/getCoverArt.view?id=${entry.coverArt}&${params}` : null
                    };
                    const insertTrack = database_1.default.prepare(`
                        INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url)
                        VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url)
                        ON CONFLICT(vendor_id) DO UPDATE SET 
                            image_url = excluded.image_url,
                            title = excluded.title
                        RETURNING id
                     `);
                    const trackRow = insertTrack.get(trackData);
                    // Stateful Scrobbling Logic
                    const currentState = userPlayerStats.get(user.id);
                    if (currentState && currentState.vendorId === trackData.vendor_id) {
                        // Continued playback
                        const timePlayed = Date.now() - currentState.detectedAt;
                        // Scrobble rule: > 20 seconds (User Request)
                        if (!currentState.scrobbled && timePlayed > 20000) {
                            console.log(`Scrobbling Subsonic track: ${trackData.title} for user ${user.id}`);
                            database_1.default.prepare(`
                                INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source)
                                VALUES (?, ?, ?, 'subsonic')
                             `).run(user.id, currentState.trackId, new Date().toISOString());
                            currentState.scrobbled = true;
                            userPlayerStats.set(user.id, currentState);
                        }
                    }
                    else {
                        // New track detected
                        userPlayerStats.set(user.id, {
                            vendorId: trackData.vendor_id,
                            trackId: trackRow.id,
                            detectedAt: Date.now(),
                            durationMs: trackData.duration_ms,
                            scrobbled: false
                        });
                    }
                }
                else {
                    // User not playing anything?
                    // We could clear state, but maybe they paused?
                    // If we want to be strict, we clear. If we want to allow resumption, we keep it for a bit?
                    // For now, let's keep it (or key it by timeout?). 
                    // Simple approach: if gone, we assume stopped. But "NowPlaying" is ephemeral.
                    // If they stop, we won't see it next time.
                }
            }
            else {
                // Determine if we should clear state?
            }
        }
        catch (e) {
            console.error(`Error polling Subsonic for user ${user.id}:`, e);
        }
    }
}
//# sourceMappingURL=subsonic.js.map