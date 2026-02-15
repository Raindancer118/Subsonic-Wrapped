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
        SELECT t.*, ph.played_at, ph.source, ph.listened_duration_ms
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ?
        ORDER BY ph.played_at DESC
        LIMIT ?
    `).all(userId, limit);

    res.json({ history });
});

// Extended Stats for Dashboard
router.get('/extended', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;

    // Top Genres
    const topGenres = db.prepare(`
        SELECT t.genre, COUNT(*) as count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.genre IS NOT NULL
        GROUP BY t.genre
        ORDER BY count DESC
        LIMIT 10
    `).all(userId);

    // Hourly Activity (0-23)
    const hourlyActivity = db.prepare(`
        SELECT strftime('%H', ph.played_at) as hour, COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ?
        GROUP BY hour
        ORDER BY hour ASC
    `).all(userId);

    // Weekly Activity (0=Sunday, 6=Saturday)
    const weeklyActivity = db.prepare(`
        SELECT strftime('%w', ph.played_at) as day, COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ?
        GROUP BY day
        ORDER BY day ASC
    `).all(userId);

    // Release Year Distribution
    const yearDistribution = db.prepare(`
        SELECT t.year, COUNT(*) as count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.year IS NOT NULL
        GROUP BY t.year
        ORDER BY t.year ASC
    `).all(userId);

    // Quality Stats (Average Bitrate)
    const qualityStats = db.prepare(`
        SELECT AVG(t.bitrate) as avg_bitrate, MAX(t.bitrate) as max_bitrate
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.bitrate IS NOT NULL
    `).get(userId);

    // Platform Split
    const platformStats = db.prepare(`
        SELECT ph.source, COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ?
        GROUP BY ph.source
    `).all(userId);

    res.json({
        genres: topGenres,
        hourly: hourlyActivity,
        weekly: weeklyActivity,
        years: yearDistribution,
        quality: qualityStats,
        platforms: platformStats
    });
});

export default router;
