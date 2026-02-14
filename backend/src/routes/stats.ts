import express from 'express';
import db from '../database';

const router = express.Router();

// Summary Stats
router.get('/summary', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;

    // Total Time (All Time) -> Using actual listened duration
    const totalTime = db.prepare(`
        SELECT SUM(ph.listened_duration_ms) as total_ms 
        FROM play_history ph
        WHERE ph.user_id = ?
    `).get(userId) as { total_ms: number };

    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = db.prepare(`
        SELECT SUM(ph.listened_duration_ms) as total_ms
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.played_at >= ?
    `).get(userId, today.toISOString()) as { total_ms: number };

    // Top Artists (All Time)
    const topArtists = db.prepare(`
        SELECT t.artist, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ?
        GROUP BY t.artist
        ORDER BY play_count DESC
        LIMIT 5
    `).all(userId);

    res.json({
        total_time_ms: totalTime?.total_ms || 0,
        today_time_ms: todayTime?.total_ms || 0,
        top_artists: topArtists
    });
});

// Recent History
router.get('/recent', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const limit = 50;

    const history = db.prepare(`
        SELECT t.*, ph.played_at, ph.source
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ?
        ORDER BY ph.played_at DESC
        LIMIT ?
    `).all(userId, limit);

    res.json({ history });
});

export default router;
