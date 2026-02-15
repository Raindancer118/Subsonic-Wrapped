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
import { aiService } from '../services/ai';

/**
 * Helper to calculate stats for a given user and year range
 */
function getWrappedStats(userId: number, requestYear: number, range: string) {
    // Parse Date Range
    let startDate = new Date();
    let endDate = new Date();

    // Set range to full year
    startDate = new Date(requestYear, 0, 1); // Jan 1
    endDate = new Date(requestYear + 1, 0, 1); // Jan 1 next year

    // Range override
    if (range === 'all') {
        startDate = new Date(1970, 0, 1);
        endDate = new Date(3000, 0, 1);
    }

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    // 1. Basic Stats
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

    // 2. Top Artist
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
        const artistImage = db.prepare(`
            SELECT image_url FROM tracks WHERE artist = ? AND image_url IS NOT NULL LIMIT 1
        `).get(topArtist.artist) as any;
        topArtist.image_url = artistImage?.image_url;

        const artistTopTrack = db.prepare(`
            SELECT t.title, COUNT(*) as count 
            FROM play_history ph
            JOIN tracks t ON ph.track_id = t.id
            WHERE ph.user_id = ? AND t.artist = ? AND ph.listened_duration_ms >= 30000
            GROUP BY t.title ORDER BY count DESC LIMIT 1
        `).get(userId, topArtist.artist) as any;
        topArtist.top_track = artistTopTrack?.title;
    }

    // 3. Top Songs
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

    // 4. Top Genres
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

    // 5. Audio Day
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

    // 6. Listening Age
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

    // 7. Personality
    let archetype = "The Music Fan";
    let traits = [];

    const totalPlays = basicStats.total_plays || 1;
    const uniqueness = (basicStats.unique_artists || 0) / totalPlays;
    const topArtistShare = topArtist ? (topArtist.play_count / totalPlays) : 0;

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
    } else if (listeningAge?.avg_year && listeningAge.avg_year > (new Date().getFullYear() - 2)) {
        archetype = "The Modernist";
        traits.push("Always on the cutting edge");
    } else {
        const topTime = hourlyStats[0]?.time_of_day;
        if (topTime === 'Night') archetype = "The Night Owl";
        else if (topTime === 'Morning') archetype = "The Early Bird";
        else if (topTime === 'Afternoon') archetype = "The 9-to-5er";
        else if (topGenres.length > 5) archetype = "The Genre Hopper";
        else archetype = "The Balanced Listener";
    }

    return {
        year: requestYear,
        basicStats,
        topArtist,
        topSongs,
        topGenres,
        hourlyStats,
        listeningAge,
        personality: { archetype, traits, stats: { diversity: uniqueness, top_artist_share: topArtistShare } }
    };
}

router.get('/', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const currentYear = new Date().getFullYear();
    const requestYear = req.query.year ? parseInt(req.query.year as string) : currentYear;
    const range = req.query.range as string || 'year';

    const data = getWrappedStats(userId, requestYear, range);

    res.json({
        year: data.year,
        total_plays: data.basicStats.total_plays,
        total_time_ms: data.basicStats.total_time_ms,
        unique_artists: data.basicStats.unique_artists,
        unique_tracks: data.basicStats.unique_tracks,
        top_artist: data.topArtist,
        top_songs: data.topSongs,
        top_genres: data.topGenres,
        audio_day: data.hourlyStats,
        listening_age: data.listeningAge?.avg_year,
        personality: data.personality
    });
});

/**
 * POST /api/wrapped/ai-analysis
 * Generates "Roast" and "Vibe Check"
 */
router.post('/ai-analysis', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const currentYear = new Date().getFullYear();
    const requestYear = req.body.year ? parseInt(req.body.year) : currentYear;

    // Check Cache first
    try {
        const roastKey = `wrapped_roast_${requestYear}`;
        const vibeKey = `wrapped_vibe_${requestYear}`;

        const existingRoast = db.prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get(roastKey, userId) as { value: string };
        const existingVibe = db.prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get(vibeKey, userId) as { value: string };

        if (existingRoast && existingVibe && !req.body.force) {
            return res.json({
                roast: existingRoast.value,
                vibe: existingVibe.value
            });
        }

        // Calculate Stats for Context
        const stats = getWrappedStats(userId, requestYear, 'year');
        const topArtistsList = stats.topArtist ? [stats.topArtist.artist] : []; // Top artist object only has one
        // Wait, getWrappedStats calculates topArtist as a single object.
        // I might want top 5 artists for better AI context.
        // Let's do a quick query for top 5 artists here.
        const top5Artists = db.prepare(`
            SELECT t.artist FROM play_history ph JOIN tracks t ON ph.track_id = t.id
            WHERE ph.user_id = ? AND ph.played_at >= ? AND ph.played_at < ? AND ph.listened_duration_ms >= 30000
            GROUP BY t.artist ORDER BY COUNT(*) DESC LIMIT 5
        `).all(userId, new Date(requestYear, 0, 1).toISOString(), new Date(requestYear + 1, 0, 1).toISOString()) as { artist: string }[];

        const artistNames = top5Artists.map(a => a.artist).join(', ');
        const genreNames = stats.topGenres.map((g: any) => g.genre).join(', ');
        const minutes = Math.round((stats.basicStats.total_time_ms || 0) / 60000);
        const timeOfDay = stats.hourlyStats[0]?.time_of_day || 'Unknown';
        const age = stats.listeningAge?.avg_year || 'Unknown';

        // Tasks
        const roastPrompt = `Roast this user's music taste based on: Top Artists: ${artistNames}. Top Genres: ${genreNames}. Total Listening: ${minutes} minutes. Be snarky, funny, and slightly mean but lighthearted. Max 50 words.`;
        const vibePrompt = `Describe this user's musical year in 2 poetic, atmospheric sentences based on: Top Artists: ${artistNames}. Top Genres: ${genreNames}. Audio Day: ${timeOfDay}. Listening Era: ${age}s. Max 40 words.`;

        // Parallel Execution
        const [roast, vibe] = await Promise.all([
            aiService.generateText(userId, roastPrompt),
            aiService.generateText(userId, vibePrompt)
        ]);

        // Save to DB
        const upsert = db.prepare(`
            INSERT INTO settings (key, value, user_id, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key, user_id) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `);

        db.transaction(() => {
            upsert.run(roastKey, roast, userId);
            upsert.run(vibeKey, vibe, userId);
        })();

        res.json({ roast, vibe });

    } catch (e: any) {
        console.error("AI Analysis Failed:", e);
        res.status(500).json({ error: "Failed to generate AI analysis. Check your AI settings." });
    }
});

export default router;
