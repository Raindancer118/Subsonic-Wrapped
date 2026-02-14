"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const zod_1 = require("zod");
const router = express_1.default.Router();
const scrobbleSchema = zod_1.z.object({
    artist: zod_1.z.string(),
    track: zod_1.z.string(),
    album: zod_1.z.string().optional(),
    duration: zod_1.z.number().optional(), // In seconds usually, or ms
    timestamp: zod_1.z.number(), // Unix timestamp (seconds or ms?) usually seconds for Last.fm standards, but let's accept ms or check
    source: zod_1.z.string().default('scrobble')
});
router.post('/', (req, res) => {
    // Check auth? Scrobbling usually requires auth.
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const data = scrobbleSchema.parse(req.body);
        const userId = req.user.id;
        // Vendor ID for custom scrobbles? 
        // We can generate one: `scrobble:artist:track` hash?
        // Or leave it null? `vendor_id` matches `spotify:...` or `subsonic:...`.
        // If we don't have a vendor ID, maybe we shouldn't insert into `tracks` if we want unique vendor IDs?
        // Or we use a custom scheme: `custom:md5(artist+track)`
        const vendorId = `custom:${data.artist}:${data.track}`.toLowerCase().replace(/\s+/g, '-');
        const trackData = {
            vendor_id: vendorId,
            title: data.track,
            artist: data.artist,
            album: data.album || null,
            duration_ms: data.duration ? data.duration * 1000 : null,
            image_url: null
        };
        const insertTrack = database_1.default.prepare(`
            INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url)
            VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url)
            ON CONFLICT(vendor_id) DO UPDATE SET 
                title = excluded.title
            RETURNING id
        `);
        const trackRow = insertTrack.get(trackData);
        // Timestamp: Determine if ms or s. If < 10000000000 (roughly year 2286 in seconds), treat as seconds?
        // Current: 1.7e9. 
        let playedAt = new Date(data.timestamp);
        if (data.timestamp < 10000000000) {
            playedAt = new Date(data.timestamp * 1000);
        }
        database_1.default.prepare(`
            INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source)
            VALUES (?, ?, ?, ?)
        `).run(userId, trackRow.id, playedAt.toISOString(), data.source);
        res.json({ success: true, track_id: trackRow.id });
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: e.issues });
        }
        else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});
exports.default = router;
//# sourceMappingURL=scrobble.js.map