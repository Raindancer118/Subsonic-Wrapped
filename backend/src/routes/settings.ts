import express from 'express';
import db from '../database';
import { z } from 'zod';
import { verifySubsonic } from '../utils/subsonic';
import { encrypt } from '../utils/encryption';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET /connections
router.get('/connections', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = req.user as any;

    const spotifyConnected = !!user.spotify_access_token;

    // Get Subsonic Servers
    const servers = db.prepare('SELECT id, name, url FROM subsonic_servers WHERE user_id = ?').all(user.id);

    res.json({
        spotify: spotifyConnected,
        subsonic: servers
    });
});

// POST /subsonic (Add Server)
const addServerSchema = z.object({
    url: z.string().url(),
    username: z.string(),
    password: z.string(),
    name: z.string().optional()
});

router.post('/subsonic', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = req.user as any;

    try {
        const { url, username, password, name } = addServerSchema.parse(req.body);

        // Verify
        const salt = crypto.randomBytes(6).toString('hex');
        const token = crypto.createHash('md5').update(password + salt).digest('hex');

        const isValid = await verifySubsonic(url, username, token, salt);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Subsonic credentials or URL unreachable' });
        }

        // Encrypt & Save
        const authData = JSON.stringify({
            subsonicUser: username,
            password: encrypt(password)
        });

        db.prepare('INSERT INTO subsonic_servers (user_id, name, url, auth) VALUES (?, ?, ?, ?)').run(user.id, name || 'Subsonic Server', url, authData);

        res.json({ success: true });
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /subsonic/:id
router.delete('/subsonic/:id', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = req.user as any;

    db.prepare('DELETE FROM subsonic_servers WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
    res.json({ success: true });
});

// Knowledge Base
const kbDir = path.resolve(__dirname, '../../../documentation/knowledge_base');

router.get('/kb', (req, res) => {
    if (!fs.existsSync(kbDir)) return res.json([]);
    const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
    const articles = files.map(f => ({
        id: f,
        title: f.replace(/_/g, ' ').replace('.md', '')
    }));
    res.json(articles);
});

router.get('/kb/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(kbDir, safeName);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.send(content);
    } else {
        res.status(404).send('Article not found');
    }
});

export default router;
