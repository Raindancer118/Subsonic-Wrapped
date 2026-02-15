import express from 'express';
import db from '../database';
import { z } from 'zod';

const router = express.Router();

// ListenBrainz Payload Schema
const listenSchema = z.object({
    listen_type: z.enum(['single', 'playing_now', 'import']),
    payload: z.array(z.object({
        listened_at: z.number().optional(), // Unix timestamp
        track_metadata: z.object({
            artist_name: z.string(),
            track_name: z.string(),
            release_name: z.string().optional(),
            duration_ms: z.number().optional().or(z.string().transform(val => parseInt(val))), // LB might send strings? Usually numbers.
            mbid_mapping: z.object({
                recording_mbid: z.string().optional(),
                release_mbid: z.string().optional(),
                artist_mbids: z.array(z.string()).optional(),
            }).optional(),
            additional_info: z.record(z.any()).optional()
        })
    }))
});

router.post('/1/submit-listens', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Token ')) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header. Expected "Token <your_token>"' });
    }

    const token = authHeader.split(' ')[1];
    const user = db.prepare('SELECT id FROM users WHERE listenbrainz_token = ?').get(token) as { id: number } | undefined;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }

    try {
        const body = listenSchema.parse(req.body);

        if (body.listen_type === 'playing_now') {
            // "Playing Now" - Update user status? 
            // For now, we optionally log it or just ignore it as we primarily care about history.
            // If we want to show "Now Playing" from scrobblers, we'd need to store this in `userPlayerStats`.
            // Let's implement basic "Now Playing" support later if requested. For history, it's irrelevant.
            return res.status(200).json({ status: 'ok' });
        }

        const insertedTracks: number[] = [];

        for (const item of body.payload) {
            const meta = item.track_metadata;
            const listenedAt = item.listened_at ? new Date(item.listened_at * 1000) : new Date(); // LB uses seconds

            // Construct Vendor ID
            // Ideally we use MBID if available, but for Navidrome generic scrobbling, use artist+track hash.
            // Let's stick to our custom schema for consistency with `scrobble.ts`
            const vendorId = `scrobble:${meta.artist_name}:${meta.track_name}`.toLowerCase().replace(/\s+/g, '-');

            const trackData = {
                vendor_id: vendorId,
                title: meta.track_name,
                artist: meta.artist_name,
                album: meta.release_name || null,
                duration_ms: meta.duration_ms || null,
                image_url: null, // LB doesn't send images usually
                raw_data: JSON.stringify(item)
            };

            const insertTrack = db.prepare(`
                INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url, raw_data)
                VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url, @raw_data)
                ON CONFLICT(vendor_id) DO UPDATE SET 
                    title = excluded.title,
                    raw_data = excluded.raw_data
                RETURNING id
            `);

            const trackRow = insertTrack.get(trackData) as { id: number };
            insertedTracks.push(trackRow.id);

            db.prepare(`
                INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source, listened_duration_ms)
                VALUES (?, ?, ?, ?, ?)
            `).run(user.id, trackRow.id, listenedAt.toISOString(), 'listenbrainz', meta.duration_ms || 0);
        }

        res.status(200).json({ status: 'ok', listened_count: insertedTracks.length });

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            res.status(400).json({ error: 'BadRequest', message: e.issues });
        } else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

export default router;
