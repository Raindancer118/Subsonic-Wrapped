import express from 'express';
import db from '../database';
import { z } from 'zod';

const router = express.Router();

const scrobbleSchema = z.object({
    artist: z.string(),
    track: z.string(),
    album: z.string().optional(),
    duration: z.number().optional(), // In seconds usually, or ms
    timestamp: z.number(), // Unix timestamp (seconds or ms?) usually seconds for Last.fm standards, but let's accept ms or check
    source: z.string().default('scrobble')
});

router.post('/', (req, res) => {
    // Check auth? Scrobbling usually requires auth.
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const data = scrobbleSchema.parse(req.body);
        const userId = (req.user as any).id;

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

        const insertTrack = db.prepare(`
            INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url)
            VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url)
            ON CONFLICT(vendor_id) DO UPDATE SET 
                title = excluded.title
            RETURNING id
        `);

        const trackRow = insertTrack.get(trackData) as { id: number };

        // Timestamp: Determine if ms or s. If < 10000000000 (roughly year 2286 in seconds), treat as seconds?
        // Current: 1.7e9. 
        let playedAt = new Date(data.timestamp);
        if (data.timestamp < 10000000000) {
            playedAt = new Date(data.timestamp * 1000);
        }

        db.prepare(`
            INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source)
            VALUES (?, ?, ?, ?)
        `).run(userId, trackRow.id, playedAt.toISOString(), data.source);

        res.json({ success: true, track_id: trackRow.id });

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            res.status(400).json({ error: e.issues });
        } else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

export default router;
