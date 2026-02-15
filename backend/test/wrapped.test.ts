import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import wrappedRoutes from '../src/routes/wrapped';
import db from '../src/database';

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Mock Auth
app.use((req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    req.isAuthenticated = () => true;
    next();
});

app.use('/api/wrapped', wrappedRoutes);

describe('Wrapped API', () => {
    beforeAll(() => {
        // Setup Teardown
        db.prepare('DELETE FROM play_history WHERE user_id = 1').run();
        db.prepare('DELETE FROM tracks').run();
        db.prepare('DELETE FROM users WHERE id = 1').run();

        // Create User
        db.prepare('INSERT INTO users (id, username, password) VALUES (1, "testuser", "hash")').run();

        // Create Tracks
        const insertTrack = db.prepare(`
            INSERT INTO tracks (id, vendor_id, title, artist, duration_ms, year, genre)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertTrack.run(1, 't1', 'Long Song', 'Artist A', 60000, 2020, 'Pop');
        insertTrack.run(2, 't2', 'Short Song', 'Artist B', 10000, 2024, 'Rock');
        insertTrack.run(3, 't3', 'Old Song', 'Artist C', 200000, 1990, 'Jazz');

        // Create Play History
        const insertPlay = db.prepare(`
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

    it('should return 200 and correct structure', async () => {
        const res = await request(app).get('/api/wrapped');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total_plays');
        expect(res.body).toHaveProperty('personality');
    });

    it('should enforce 30s rule', async () => {
        const res = await request(app).get('/api/wrapped');
        // We inserted 4 plays, but only 3 are > 30s.
        expect(res.body.total_plays).toBe(3);
    });

    it('should identify top artist correctly', async () => {
        const res = await request(app).get('/api/wrapped');
        // Artist A played twice (validly), Artist C once.
        expect(res.body.top_artist.artist).toBe('Artist A');
        expect(res.body.top_artist.play_count).toBe(2);
    });

    it('should calculate listening age correctly', async () => {
        const res = await request(app).get('/api/wrapped');
        // A (2020) x 2, C (1990) x 1
        // (2020*2 + 1990) / 3 = (4040 + 1990) / 3 = 6030 / 3 = 2010
        expect(res.body.listening_age).toBe(2010);
    });
});
