"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const wrapped_1 = __importDefault(require("../src/routes/wrapped"));
const database_1 = __importDefault(require("../src/database"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, express_session_1.default)({ secret: 'test', resave: false, saveUninitialized: true }));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Mock Auth
app.use((req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    req.isAuthenticated = () => true;
    next();
});
app.use('/api/wrapped', wrapped_1.default);
(0, vitest_1.describe)('Wrapped API', () => {
    (0, vitest_1.beforeAll)(() => {
        // Setup Teardown
        database_1.default.prepare('DELETE FROM play_history WHERE user_id = 1').run();
        database_1.default.prepare('DELETE FROM tracks').run();
        database_1.default.prepare('DELETE FROM users WHERE id = 1').run();
        // Create User
        database_1.default.prepare('INSERT INTO users (id, username, password) VALUES (1, "testuser", "hash")').run();
        // Create Tracks
        const insertTrack = database_1.default.prepare(`
            INSERT INTO tracks (id, vendor_id, title, artist, duration_ms, year, genre)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertTrack.run(1, 't1', 'Long Song', 'Artist A', 60000, 2020, 'Pop');
        insertTrack.run(2, 't2', 'Short Song', 'Artist B', 10000, 2024, 'Rock');
        insertTrack.run(3, 't3', 'Old Song', 'Artist C', 200000, 1990, 'Jazz');
        // Create Play History
        const insertPlay = database_1.default.prepare(`
            INSERT INTO play_history (user_id, track_id, played_at, source, listened_duration_ms)
            VALUES (?, ?, ?, ?, ?)
        `);
        const now = new Date();
        // Valid Play (Artist A)
        insertPlay.run(1, 1, now.toISOString(), 'test', 60000);
        // Invalid Play (<30s) (Artist B)
        insertPlay.run(1, 2, now.toISOString(), 'test', 5000);
        // Valid Play (Artist C)
        insertPlay.run(1, 3, now.toISOString(), 'test', 50000);
        // Valid Play (Artist A) - Repeated
        insertPlay.run(1, 1, now.toISOString(), 'test', 40000);
    });
    (0, vitest_1.it)('should return 200 and correct structure', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/wrapped');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toHaveProperty('total_plays');
        (0, vitest_1.expect)(res.body).toHaveProperty('personality');
    });
    (0, vitest_1.it)('should enforce 30s rule', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/wrapped');
        // We inserted 4 plays, but only 3 are > 30s.
        (0, vitest_1.expect)(res.body.total_plays).toBe(3);
    });
    (0, vitest_1.it)('should identify top artist correctly', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/wrapped');
        // Artist A played twice (validly), Artist C once.
        (0, vitest_1.expect)(res.body.top_artist.artist).toBe('Artist A');
        (0, vitest_1.expect)(res.body.top_artist.play_count).toBe(2);
    });
    (0, vitest_1.it)('should calculate listening age correctly', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/wrapped');
        // A (2020) x 2, C (1990) x 1
        // (2020*2 + 1990) / 3 = (4040 + 1990) / 3 = 6030 / 3 = 2010
        (0, vitest_1.expect)(res.body.listening_age).toBe(2010);
    });
});
//# sourceMappingURL=wrapped.test.js.map