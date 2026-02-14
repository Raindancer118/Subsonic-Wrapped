"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const router = express_1.default.Router();
// Summary Stats
router.get('/summary', (req, res) => {
    if (!req.isAuthenticated() || !req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    // Total Time (All Time)
    const totalTime = database_1.default.prepare(`
        SELECT SUM(t.duration_ms) as total_ms 
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ?
    `).get(userId);
    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = database_1.default.prepare(`
        SELECT SUM(t.duration_ms) as total_ms
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ? AND ph.played_at >= ?
    `).get(userId, today.toISOString());
    // Top Artists (All Time)
    const topArtists = database_1.default.prepare(`
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
    if (!req.isAuthenticated() || !req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    const limit = 50;
    const history = database_1.default.prepare(`
        SELECT t.*, ph.played_at, ph.source
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ?
        ORDER BY ph.played_at DESC
        LIMIT ?
    `).all(userId, limit);
    res.json({ history });
});
exports.default = router;
//# sourceMappingURL=stats.js.map