import express from 'express';
import db from '../database';

const router = express.Router();

// Helper to get date range filter
const getDateRange = (range: string): string => {
    const now = new Date();
    // Default to 'all' if invalid
    switch (range) {
        case 'today':
            now.setHours(0, 0, 0, 0);
            return now.toISOString();
        case '7d':
            now.setDate(now.getDate() - 7);
            return now.toISOString();
        case '30d':
            now.setDate(now.getDate() - 30);
            return now.toISOString();
        case 'year':
            now.setFullYear(now.getFullYear() - 1);
            return now.toISOString();
        case 'all':
        default:
            return '1970-01-01T00:00:00.000Z';
    }
};

// Summary Stats
router.get('/summary', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const range = (req.query.range as string) || 'all';
    const startDate = getDateRange(range);

    // Total Time (Filtered)
    const totalTime = db.prepare(`
        SELECT SUM(ph.listened_duration_ms) as total_ms 
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.played_at >= ?
    `).get(userId, startDate) as { total_ms: number };

    // Today Time (Always Today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTime = db.prepare(`
        SELECT SUM(ph.listened_duration_ms) as total_ms
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.played_at >= ?
    `).get(userId, todayStart.toISOString()) as { total_ms: number };

    // Top Artists (Filtered)
    const topArtists = db.prepare(`
        SELECT t.artist, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ?
        GROUP BY t.artist
        ORDER BY play_count DESC
        LIMIT 5
    `).all(userId, startDate);

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

// Extended Stats
router.get('/extended', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const range = (req.query.range as string) || 'all';
    const startDate = getDateRange(range);

    // Top Genres
    const topGenres = db.prepare(`
        SELECT t.genre, COUNT(*) as count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ? AND t.genre IS NOT NULL
        GROUP BY t.genre
        ORDER BY count DESC
        LIMIT 10
    `).all(userId, startDate);

    // Hourly
    const hourlyActivity = db.prepare(`
        SELECT strftime('%H', ph.played_at) as hour, COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.played_at >= ?
        GROUP BY hour
        ORDER BY hour ASC
    `).all(userId, startDate);

    // Weekly
    const weeklyActivity = db.prepare(`
        SELECT strftime('%w', ph.played_at) as day, COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.played_at >= ?
        GROUP BY day
        ORDER BY day ASC
    `).all(userId, startDate);

    // Years
    const yearDistribution = db.prepare(`
        SELECT t.year, COUNT(*) as count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ? AND t.year IS NOT NULL
        GROUP BY t.year
        ORDER BY t.year ASC
    `).all(userId, startDate);

    // Quality
    const qualityStats = db.prepare(`
        SELECT AVG(t.bitrate) as avg_bitrate, MAX(t.bitrate) as max_bitrate
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ? AND t.bitrate IS NOT NULL
    `).get(userId, startDate);

    // Platforms
    const platformStats = db.prepare(`
        SELECT ph.source, COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.played_at >= ?
        GROUP BY ph.source
    `).all(userId, startDate);

    res.json({
        genres: topGenres,
        hourly: hourlyActivity,
        weekly: weeklyActivity,
        years: yearDistribution,
        quality: qualityStats,
        platforms: platformStats
    });
});

// New Endpoint: Top Tracks
router.get('/top/tracks', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const range = (req.query.range as string) || 'all';
    const startDate = getDateRange(range);

    const topTracks = db.prepare(`
        SELECT t.id, t.title, t.artist, t.album, t.image_url, COUNT(*) as play_count, SUM(ph.listened_duration_ms) as total_duration_ms
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ?
        GROUP BY t.id
        ORDER BY play_count DESC
        LIMIT 50
    `).all(userId, startDate);

    res.json(topTracks);
});

// New Endpoint: Top Albums
router.get('/top/albums', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const range = (req.query.range as string) || 'all';
    const startDate = getDateRange(range);

    const topAlbums = db.prepare(`
        SELECT t.album, t.artist, t.image_url, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ? AND t.album IS NOT NULL
        GROUP BY t.album
        ORDER BY play_count DESC
        LIMIT 50
    `).all(userId, startDate);

    res.json(topAlbums);
});

// Detail Endpoint: Artist Stats
router.get('/artist/:name', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const artistName = decodeURIComponent(req.params.name);

    // Summary
    const summary = db.prepare(`
        SELECT COUNT(*) as play_count, SUM(ph.listened_duration_ms) as total_time_ms
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.artist = ?
    `).get(userId, artistName) as any;

    // Top Tracks
    const topTracks = db.prepare(`
        SELECT t.id, t.title, t.album, t.image_url, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.artist = ?
        GROUP BY t.id
        ORDER BY play_count DESC
        LIMIT 10
    `).all(userId, artistName);

    // Albums
    const albums = db.prepare(`
        SELECT t.album, t.image_url, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.artist = ? AND t.album IS NOT NULL
        GROUP BY t.album
        ORDER BY play_count DESC
        LIMIT 10
    `).all(userId, artistName);

    res.json({
        name: artistName,
        ...summary,
        top_tracks: topTracks,
        albums: albums
    });
});

// Detail Endpoint: Album Stats
router.get('/album/:name', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const albumName = decodeURIComponent(req.params.name);
    const artistName = req.query.artist ? decodeURIComponent(req.query.artist as string) : null;

    let queryParams = [userId, albumName];
    let artistClause = "";
    if (artistName) {
        artistClause = "AND t.artist = ?";
        queryParams.push(artistName);
    }

    // Summary
    const summary = db.prepare(`
        SELECT t.artist, COUNT(*) as play_count, SUM(ph.listened_duration_ms) as total_time_ms, MAX(t.image_url) as image_url
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.album = ? ${artistClause}
    `).get(...queryParams) as any;

    // Tracks in Album
    const tracks = db.prepare(`
        SELECT t.id, t.title, t.artist, t.track_number, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND t.album = ? ${artistClause}
        GROUP BY t.id
        ORDER BY t.track_number ASC, play_count DESC
    `).all(...queryParams);

    res.json({
        album: albumName,
        artist: summary?.artist || artistName,
        image_url: summary?.image_url,
        play_count: summary?.play_count || 0,
        total_time_ms: summary?.total_time_ms || 0,
        tracks: tracks
    });
});

// Detail Endpoint: Track Stats
router.get('/track/:id', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const trackId = req.params.id;

    // Info & Consolidated Stats
    const info = db.prepare(`
        SELECT t.*, COUNT(ph.id) as play_count, SUM(ph.listened_duration_ms) as total_time_ms
        FROM tracks t
        LEFT JOIN play_history ph ON t.id = ph.track_id AND ph.user_id = ?
        WHERE t.id = ?
        GROUP BY t.id
    `).get(userId, trackId);

    if (!info) return res.status(404).json({ error: 'Track not found' });

    // Recent History for this track
    const history = db.prepare(`
        SELECT ph.played_at, ph.listened_duration_ms, ph.source
        FROM play_history ph
        WHERE ph.user_id = ? AND ph.track_id = ?
        ORDER BY ph.played_at DESC
        LIMIT 10
    `).all(userId, trackId);

    res.json({
        ...info,
        history: history
    });
});

export default router;
