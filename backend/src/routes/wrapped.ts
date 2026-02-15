import express from 'express';
import db from '../database';

const router = express.Router();

/**
 * GET /api/wrapped
 * Returns all stats needed for the "Year in Review" story.
 * Query Params:
 *  - year: (optional) Filter by specific year (e.g. 2024). Defaults to current year.
 *  - range: (optional) 'all', 'year'. Overrides year if set to 'all'.
 */
router.get('/', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;

    // Parse Date Range
    let startDate = new Date();
    let endDate = new Date();

    // Default: Current Year
    const currentYear = new Date().getFullYear();
    const requestYear = req.query.year ? parseInt(req.query.year as string) : currentYear;

    // Set range to full year
    startDate = new Date(requestYear, 0, 1); // Jan 1
    endDate = new Date(requestYear + 1, 0, 1); // Jan 1 next year

    // Range override
    if (req.query.range === 'all') {
        startDate = new Date(1970, 0, 1);
        endDate = new Date(3000, 0, 1);
    }

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    // ---------------------------------------------------------
    // 1. Basic Stats (Minutes, Plays) - STRICT 30s Filter
    // ---------------------------------------------------------
    const basicStats = db.prepare(`
        SELECT 
            COUNT(*) as total_plays, 
            SUM(listened_duration_ms) as total_time_ms,
            COUNT(DISTINCT track_id) as unique_tracks,
            COUNT(DISTINCT t.artist) as unique_artists
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? 
          AND ph.played_at >= ? 
          AND ph.played_at < ?
          AND ph.listened_duration_ms >= 30000 
    `).get(userId, startStr, endStr) as any;

    // ---------------------------------------------------------
    // 2. Top Arist (The One)
    // ---------------------------------------------------------
    const topArtist = db.prepare(`
        SELECT t.artist, COUNT(*) as play_count, SUM(ph.listened_duration_ms) as total_time_ms
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? 
          AND ph.played_at >= ? 
          AND ph.played_at < ?
          AND ph.listened_duration_ms >= 30000
        GROUP BY t.artist
        ORDER BY play_count DESC
        LIMIT 1
    `).get(userId, startStr, endStr) as any;

    if (topArtist) {
        // Get Artist Image from one of their tracks
        const artistImage = db.prepare(`
            SELECT image_url FROM tracks WHERE artist = ? AND image_url IS NOT NULL LIMIT 1
        `).get(topArtist.artist) as any;
        topArtist.image_url = artistImage?.image_url;

        // Get Top Track for this Artist
        const artistTopTrack = db.prepare(`
            SELECT t.title, COUNT(*) as count 
            FROM play_history ph
            JOIN tracks t ON ph.track_id = t.id
            WHERE ph.user_id = ? AND t.artist = ? AND ph.listened_duration_ms >= 30000
            GROUP BY t.title ORDER BY count DESC LIMIT 1
        `).get(userId, topArtist.artist) as any;
        topArtist.top_track = artistTopTrack?.title;
    }

    // ---------------------------------------------------------
    // 3. Top Songs (Top 5)
    // ---------------------------------------------------------
    const topSongs = db.prepare(`
        SELECT t.title, t.artist, t.image_url, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? 
          AND ph.played_at >= ? 
          AND ph.played_at < ?
          AND ph.listened_duration_ms >= 30000
        GROUP BY t.id
        ORDER BY play_count DESC
        LIMIT 5
    `).all(userId, startStr, endStr);

    // ---------------------------------------------------------
    // 4. Top Genres (Top 5)
    // ---------------------------------------------------------
    const topGenres = db.prepare(`
        SELECT t.genre, COUNT(*) as play_count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? 
          AND ph.played_at >= ? 
          AND ph.played_at < ?
          AND ph.listened_duration_ms >= 30000
          AND t.genre IS NOT NULL
        GROUP BY t.genre
        ORDER BY play_count DESC
        LIMIT 5
    `).all(userId, startStr, endStr);

    // ---------------------------------------------------------
    // 5. Audio Day (Hourly Activity)
    // ---------------------------------------------------------
    const hourlyStats = db.prepare(`
        SELECT 
            CASE 
                WHEN CAST(strftime('%H', ph.played_at) AS INT) BETWEEN 5 AND 11 THEN 'Morning'
                WHEN CAST(strftime('%H', ph.played_at) AS INT) BETWEEN 12 AND 17 THEN 'Afternoon'
                WHEN CAST(strftime('%H', ph.played_at) AS INT) BETWEEN 18 AND 23 THEN 'Evening'
                ELSE 'Night'
            END as time_of_day,
            COUNT(*) as count
        FROM play_history ph
        WHERE ph.user_id = ? 
          AND ph.played_at >= ? 
          AND ph.played_at < ?
          AND ph.listened_duration_ms >= 30000
        GROUP BY time_of_day
        ORDER BY count DESC
    `).all(userId, startStr, endStr) as { time_of_day: string, count: number }[];

    // ---------------------------------------------------------
    // 6. Listening Age (Avg Release Year)
    // ---------------------------------------------------------
    const listeningAge = db.prepare(`
        SELECT CAST(AVG(t.year) AS INT) as avg_year
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? 
          AND ph.played_at >= ? 
          AND ph.played_at < ?
          AND ph.listened_duration_ms >= 30000
          AND t.year IS NOT NULL AND t.year > 1900
    `).get(userId, startStr, endStr) as any;

    // ---------------------------------------------------------
    // 7. Personality Calculations
    // ---------------------------------------------------------
    let archetype = "The Music Fan"; // Default
    let traits = [];

    const totalPlays = basicStats.total_plays || 1;
    const uniqueness = (basicStats.unique_artists || 0) / totalPlays;

    // Top Artist Ratio
    const topArtistShare = topArtist ? (topArtist.play_count / totalPlays) : 0;

    // Determine Archetype
    if (topArtistShare > 0.30) {
        archetype = "The Superfan";
        traits.push(`Top artist is ${(topArtistShare * 100).toFixed(0)}% of your listening`);
    } else if (topArtistShare > 0.20) {
        archetype = "The Loyalist";
        traits.push(`You really stick to your favorites`);
    } else if (basicStats.unique_tracks && (basicStats.unique_tracks / totalPlays) > 0.8) {
        archetype = "The Discoverer";
        traits.push("You rarely play the same song twice");
    } else if (uniqueness > 0.4) {
        archetype = "The Explorer";
        traits.push("You're always finding new artists");
    } else if (listeningAge?.avg_year && listeningAge.avg_year < 2010) {
        archetype = "The Time Traveler";
        traits.push(`Stuck in the ${Math.floor(listeningAge.avg_year / 10) * 10}s`);
    } else if (listeningAge?.avg_year && listeningAge.avg_year > (currentYear - 2)) {
        archetype = "The Modernist";
        traits.push("Always on the cutting edge");
    } else {
        // Time based checks
        const topTime = hourlyStats[0]?.time_of_day;
        if (topTime === 'Night') archetype = "The Night Owl";
        else if (topTime === 'Morning') archetype = "The Early Bird";
        else if (topTime === 'Afternoon') archetype = "The 9-to-5er";
        else if (topGenres.length > 5) archetype = "The Genre Hopper"; // Need more complexity here?
        else archetype = "The Balanced Listener";
    }

    res.json({
        year: requestYear,
        total_plays: basicStats.total_plays,
        total_time_ms: basicStats.total_time_ms,
        unique_artists: basicStats.unique_artists,
        unique_tracks: basicStats.unique_tracks,
        top_artist: topArtist,
        top_songs: topSongs,
        top_genres: topGenres,
        audio_day: hourlyStats,
        listening_age: listeningAge?.avg_year,
        personality: {
            archetype,
            traits,
            stats: {
                diversity: uniqueness,
                top_artist_share: topArtistShare
            }
        }
    });
});

export default router;
