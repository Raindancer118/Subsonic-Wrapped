"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../database"));
const encryption_1 = require("../utils/encryption");
const subsonic_1 = require("../utils/subsonic");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// Current Playback Endpoint
router.get('/current', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.user.id;
    const user = database_1.default.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    let currentTrack = null;
    let source = null;
    // 1. Check Spotify
    if (user.spotify_access_token) {
        try {
            const accessToken = (0, encryption_1.decrypt)(user.spotify_access_token);
            const response = await axios_1.default.get('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (response.data && response.data.item) {
                const item = response.data.item;
                currentTrack = {
                    title: item.name,
                    artist: item.artists.map((a) => a.name).join(', '),
                    album: item.album.name,
                    image_url: item.album.images[0]?.url,
                    duration_ms: item.duration_ms,
                    progress_ms: response.data.progress_ms,
                    is_playing: response.data.is_playing
                };
                source = 'spotify';
            }
        }
        catch (e) {
            console.error('Spotify current playing error:', e);
        }
    }
    // 2. Check Subsonic (if Spotify is not playing)
    if ((!currentTrack || !currentTrack.is_playing) && user.subsonic_auth && user.subsonic_url) {
        try {
            const authData = JSON.parse(user.subsonic_auth);
            const password = (0, encryption_1.decrypt)(authData.password || '');
            if (password) {
                const salt = crypto_1.default.randomBytes(6).toString('hex');
                const token = crypto_1.default.createHash('md5').update(password + salt).digest('hex');
                const subUser = authData.subsonicUser || user.username;
                const params = (0, subsonic_1.createAuthParams)(subUser, token, salt);
                const baseURL = user.subsonic_url.endsWith('/') ? user.subsonic_url.slice(0, -1) : user.subsonic_url;
                const response = await axios_1.default.get(`${baseURL}/rest/getNowPlaying.view?${params}`);
                const nowPlaying = response.data['subsonic-response']?.nowPlaying?.entry;
                if (nowPlaying) {
                    const entries = Array.isArray(nowPlaying) ? nowPlaying : [nowPlaying];
                    // Filter for our user
                    const entry = entries.find((e) => e.username === subUser);
                    if (entry) {
                        // Subsonic doesn't always send "is_playing", but if it's in NowPlaying, it's usually playing or paused recently.
                        // We assume playing if minutes ago < X?
                        // "minutesAgo" field exists.
                        const minutesAgo = entry.minutesAgo || 0;
                        if (minutesAgo < 20) { // arbitrary threshold
                            currentTrack = {
                                title: entry.title,
                                artist: entry.artist,
                                album: entry.album,
                                image_url: entry.coverArt ? `${baseURL}/rest/getCoverArt.view?id=${entry.coverArt}&${params}` : null,
                                duration_ms: entry.duration ? entry.duration * 1000 : 0,
                                progress_ms: 0, // Subsonic doesn't usually expose progress in getNowPlaying easily
                                is_playing: true
                            };
                            source = 'subsonic';
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error('Subsonic current playing error:', e);
        }
    }
    res.json({
        source,
        track: currentTrack
    });
});
exports.default = router;
//# sourceMappingURL=player.js.map