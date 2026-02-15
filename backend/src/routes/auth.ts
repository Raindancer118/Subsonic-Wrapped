import express from 'express';
import passport from '../auth';
import db from '../database';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { verifySubsonic } from '../utils/subsonic';
import { encrypt } from '../utils/encryption';
import crypto from 'crypto';

const router = express.Router();

const registerSchema = z.object({
    username: z.string().min(3).max(30),
    password: z.string().min(8)
});

// Helper to ensure token exists
function ensureListenBrainzToken(user: any) {
    if (!user.listenbrainz_token) {
        const token = crypto.randomBytes(16).toString('hex');
        db.prepare('UPDATE users SET listenbrainz_token = ? WHERE id = ?').run(token, user.id);
        user.listenbrainz_token = token;
    }
    return user;
}

router.post('/login', passport.authenticate('local'), (req, res) => {
    const user = ensureListenBrainzToken(req.user);
    res.json({ user });
});

router.post('/register', async (req, res) => {
    try {
        const { username, password } = registerSchema.parse(req.body);

        // Check existing
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const hash = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(16).toString('hex');
        const result = db.prepare('INSERT INTO users (username, password_hash, listenbrainz_token) VALUES (?, ?, ?)').run(username, hash, token);

        const user = { id: result.lastInsertRowid, username, listenbrainz_token: token };
        req.login(user, (err) => {
            if (err) return res.status(500).json({ error: 'Login failed after register' });
            res.json({ user });
        });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            res.status(400).json({ error: e.issues });
        } else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// ... (Subsonic Register - similar update needed) ...

const subsonicRegisterSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8), // App password
    subsonicUrl: z.string().url(),
    subsonicUser: z.string(),
    subsonicPass: z.string()
});

router.post('/register/subsonic', async (req, res) => {
    try {
        const { username, password, subsonicUrl, subsonicUser, subsonicPass } = subsonicRegisterSchema.parse(req.body);

        // Check existing
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Verify Subsonic
        const salt = crypto.randomBytes(6).toString('hex');
        const token = crypto.createHash('md5').update(subsonicPass + salt).digest('hex');

        // ... verifySubsonic call ...
        const isValid = await verifySubsonic(subsonicUrl, subsonicUser, token, salt);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Subsonic credentials' });
        }

        // Create User
        // Create User (without Subsonic details in users table)
        const hash = await bcrypt.hash(password, 10);

        const authData = JSON.stringify({
            subsonicUser,
            password: encrypt(subsonicPass)
        });

        const lbToken = crypto.randomBytes(16).toString('hex');

        // Transaction to ensure both user and server are created
        const createUserTx = db.transaction(() => {
            const result = db.prepare('INSERT INTO users (username, password_hash, listenbrainz_token) VALUES (?, ?, ?)').run(username, hash, lbToken);
            const userId = result.lastInsertRowid as number;

            db.prepare('INSERT INTO subsonic_servers (user_id, name, url, auth) VALUES (?, ?, ?, ?)').run(userId, 'Primary Server', subsonicUrl, authData);

            return { id: userId, username, listenbrainz_token: lbToken };
        });

        const user = createUserTx();

        req.login(user, (err) => {
            if (err) return res.status(500).json({ error: 'Login failed after register' });
            res.json({ user });
        });

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            res.status(400).json({ error: e.issues });
        } else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ success: true });
    });
});

router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        // Backfill if missing (for existing users who log in)
        const user = ensureListenBrainzToken(req.user);
        res.json({ user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Spotify Auth
router.get('/spotify', passport.authenticate('spotify', {
    scope: ['user-read-recently-played', 'user-read-currently-playing', 'user-top-read']
}));

router.get('/spotify/callback', passport.authenticate('spotify', {
    failureRedirect: '/login?error=spotify_failed'
}), (req, res) => {
    res.redirect('/'); // Redirect to dashboard
});

export default router;
