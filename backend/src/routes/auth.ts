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

router.post('/login', passport.authenticate('local'), (req, res) => {
    res.json({ user: req.user });
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
        const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);

        const user = { id: result.lastInsertRowid, username };
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

        const isValid = await verifySubsonic(subsonicUrl, subsonicUser, token, salt);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Subsonic credentials' });
        }

        // Create User
        const hash = await bcrypt.hash(password, 10);
        const authData = JSON.stringify({
            subsonicUser,
            password: encrypt(subsonicPass) // Store encrypted password to regenerate token/salt dynamically
        });

        const result = db.prepare('INSERT INTO users (username, password_hash, subsonic_url, subsonic_auth) VALUES (?, ?, ?, ?)').run(username, hash, subsonicUrl, authData);

        const user = { id: result.lastInsertRowid, username };
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
        res.json({ user: req.user });
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
