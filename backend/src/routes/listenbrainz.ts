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
            additional_info: z.record(z.string(), z.any()).optional()
        })
    }))
});

// In-memory store for "Now Playing" status from ListenBrainz clients
const userNowPlaying = new Map<number, any>();

export const getListenBrainzNowPlaying = (userId: number) => {
    return userNowPlaying.get(userId);
};

const submitListensHandler = (req: any, res: any) => {
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

        // Handle "Playing Now"
        if (body.listen_type === 'playing_now') {
            const item = body.payload[0];
            if (item) {
                const meta = item.track_metadata;
                // Parse duration: try root, then additional_info, then 0
                let duration = meta.duration_ms || 0;
                if (!duration && meta.additional_info && meta.additional_info.duration_ms) {
                    duration = typeof meta.additional_info.duration_ms === 'string' ? parseInt(meta.additional_info.duration_ms) : meta.additional_info.duration_ms;
                }

                userNowPlaying.set(user.id, {
                    title: meta.track_name,
                    artist: meta.artist_name,
                    album: meta.release_name,
                    duration_ms: duration,
                    is_playing: true,
                    timestamp: Date.now()
                });
            }
            return res.status(200).json({ status: 'ok' });
        }

        const insertedTracks: number[] = [];

        for (const item of body.payload) {
            console.log('[ListenBrainz] Raw Payload Item:', JSON.stringify(item));
            const meta = item.track_metadata;

            // Safe Duration Parsing
            let duration = meta.duration_ms || 0;
            if (!duration && meta.additional_info && meta.additional_info.duration_ms) {
                duration = typeof meta.additional_info.duration_ms === 'string' ? parseInt(meta.additional_info.duration_ms) : meta.additional_info.duration_ms;
            }

            // Extract Year and Genre
            let year = null;
            if (meta.release_name) {
                // Try to find year in release name? No, unreliable.
            }
            if (meta.additional_info) {
                if (meta.additional_info.date) {
                    const dateStr = String(meta.additional_info.date);
                    const match = dateStr.match(/(\d{4})/);
                    if (match) year = parseInt(match[1]);
                } else if (meta.additional_info.release_year) {
                    year = parseInt(meta.additional_info.release_year);
                } else if (meta.additional_info.year) {
                    year = parseInt(meta.additional_info.year);
                }
            }

            let genre = null;
            if (meta.additional_info && meta.additional_info.genre) {
                // Navidrome might send array or string
                if (Array.isArray(meta.additional_info.genre)) {
                    genre = meta.additional_info.genre[0];
                } else {
                    genre = String(meta.additional_info.genre);
                }
            }

            console.log(`[ListenBrainz] Processing: ${meta.artist_name} - ${meta.track_name} (Duration: ${duration}, Year: ${year}, Genre: ${genre})`);

            const listenedAt = item.listened_at ? new Date(item.listened_at * 1000) : new Date(); // LB uses seconds

            // Construct Vendor ID
            const vendorId = `scrobble:${meta.artist_name}:${meta.track_name}`.toLowerCase().replace(/\s+/g, '-');

            const trackData = {
                vendor_id: vendorId,
                title: meta.track_name,
                artist: meta.artist_name,
                album: meta.release_name || null,
                duration_ms: duration || null,
                image_url: null,
                year: year,
                genre: genre,
                raw_data: JSON.stringify(item)
            };

            const insertTrack = db.prepare(`
                INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url, year, genre, raw_data)
                VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url, @year, @genre, @raw_data)
                ON CONFLICT(vendor_id) DO UPDATE SET 
                    title = excluded.title,
                    raw_data = excluded.raw_data,
                    duration_ms = COALESCE(excluded.duration_ms, tracks.duration_ms),
                    year = COALESCE(excluded.year, tracks.year),
                    genre = COALESCE(excluded.genre, tracks.genre)
                RETURNING id
            `);

            const trackRow = insertTrack.get(trackData) as { id: number };
            insertedTracks.push(trackRow.id);

            const result = db.prepare(`
                INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source, listened_duration_ms)
                VALUES (?, ?, ?, ?, ?)
            `).run(user.id, trackRow.id, listenedAt.toISOString(), 'listenbrainz', duration || 0);

            console.log(`[ListenBrainz] Insert result: ${result.changes} rows affected. User: ${user.id}, Track: ${trackRow.id}`);
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
};

router.post('/1/submit-listens', submitListensHandler);
router.post('/submit-listens', submitListensHandler); // Alias for Navidrome compat



// Validate Token (Used by clients like Navidrome to check connection)
const validateTokenHandler = (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Token ')) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const user = db.prepare('SELECT username FROM users WHERE listenbrainz_token = ?').get(token) as { username: string } | undefined;

    if (!user) {
        return res.status(401).json({ valid: false, message: 'Invalid token' });
    }

    res.json({
        valid: true,
        user_name: user.username,
        message: 'Token valid'
    });
};

router.get('/1/validate-token', validateTokenHandler);
router.get('/validate-token', validateTokenHandler); // Alias for Navidrome compat

export default router;
