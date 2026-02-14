"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../auth"));
const database_1 = __importDefault(require("../database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const subsonic_1 = require("../utils/subsonic");
const encryption_1 = require("../utils/encryption");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30),
    password: zod_1.z.string().min(8)
});
router.post('/login', auth_1.default.authenticate('local'), (req, res) => {
    res.json({ user: req.user });
});
router.post('/register', async (req, res) => {
    try {
        const { username, password } = registerSchema.parse(req.body);
        // Check existing
        const existing = database_1.default.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        const hash = await bcrypt_1.default.hash(password, 10);
        const result = database_1.default.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
        const user = { id: result.lastInsertRowid, username };
        req.login(user, (err) => {
            if (err)
                return res.status(500).json({ error: 'Login failed after register' });
            res.json({ user });
        });
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: e.issues });
        }
        else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});
const subsonicRegisterSchema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(8), // App password
    subsonicUrl: zod_1.z.string().url(),
    subsonicUser: zod_1.z.string(),
    subsonicPass: zod_1.z.string()
});
router.post('/register/subsonic', async (req, res) => {
    try {
        const { username, password, subsonicUrl, subsonicUser, subsonicPass } = subsonicRegisterSchema.parse(req.body);
        // Check existing
        const existing = database_1.default.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        // Verify Subsonic
        const salt = crypto_1.default.randomBytes(6).toString('hex');
        const token = crypto_1.default.createHash('md5').update(subsonicPass + salt).digest('hex');
        const isValid = await (0, subsonic_1.verifySubsonic)(subsonicUrl, subsonicUser, token, salt);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Subsonic credentials' });
        }
        // Create User
        const hash = await bcrypt_1.default.hash(password, 10);
        const authData = JSON.stringify({
            subsonicUser,
            password: (0, encryption_1.encrypt)(subsonicPass) // Store encrypted password to regenerate token/salt dynamically
        });
        const result = database_1.default.prepare('INSERT INTO users (username, password_hash, subsonic_url, subsonic_auth) VALUES (?, ?, ?, ?)').run(username, hash, subsonicUrl, authData);
        const user = { id: result.lastInsertRowid, username };
        req.login(user, (err) => {
            if (err)
                return res.status(500).json({ error: 'Login failed after register' });
            res.json({ user });
        });
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: e.issues });
        }
        else {
            console.error(e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err)
            return res.status(500).json({ error: 'Logout failed' });
        res.json({ success: true });
    });
});
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    }
    else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});
// Spotify Auth
router.get('/spotify', auth_1.default.authenticate('spotify', {
    scope: ['user-read-recently-played', 'user-read-currently-playing', 'user-top-read']
}));
router.get('/spotify/callback', auth_1.default.authenticate('spotify', {
    failureRedirect: '/login?error=spotify_failed'
}), (req, res) => {
    res.redirect('/'); // Redirect to dashboard
});
exports.default = router;
//# sourceMappingURL=auth.js.map