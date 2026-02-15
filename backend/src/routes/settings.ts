import express from 'express';
import db from '../database';
import { aiService } from '../services/ai';
import { encrypt } from '../utils/encryption';
import path from 'path';
import fs from 'fs';

const router = express.Router();

/**
 * GET /api/settings/connections
 * Get status of all external connections
 */
router.get('/connections', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;

    try {
        const user = db.prepare('SELECT spotify_refresh_token FROM users WHERE id = ?').get(userId) as any;
        const subsonicServers = db.prepare('SELECT id, name, url FROM subsonic_servers WHERE user_id = ?').all(userId);

        res.json({
            spotify: !!user?.spotify_refresh_token,
            subsonic: subsonicServers || []
        });
    } catch (e) {
        console.error('Error fetching connections:', e);
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
});

/**
 * POST /api/settings/subsonic
 * Add a new Subsonic server
 */
router.post('/subsonic', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const { url, username, password, name } = req.body;

    if (!url || !username || !password) {
        return res.status(400).json({ error: 'URL, Username and Password are required' });
    }

    try {
        const auth = JSON.stringify({
            subsonicUser: username,
            password: encrypt(password)
        });

        const insert = db.prepare('INSERT INTO subsonic_servers (user_id, url, auth, name) VALUES (?, ?, ?, ?)');
        insert.run(userId, url, auth, name || 'My Server');

        res.json({ success: true, message: 'Subsonic server added' });
    } catch (e) {
        console.error('Error adding subsonic server:', e);
        res.status(500).json({ error: 'Failed to add server' });
    }
});

/**
 * DELETE /api/settings/subsonic/:id
 * Remove a Subsonic server
 */
router.delete('/subsonic/:id', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const { id } = req.params;

    try {
        db.prepare('DELETE FROM subsonic_servers WHERE id = ? AND user_id = ?').run(id, userId);
        res.json({ success: true, message: 'Server removed' });
    } catch (e) {
        console.error('Error removing subsonic server:', e);
        res.status(500).json({ error: 'Failed to remove server' });
    }
});

/**
 * GET /api/settings/kb
 * List Knowledge Base articles
 */
router.get('/kb', (req, res) => {
    const kbPath = path.resolve(__dirname, '../../../documentation/knowledge_base');
    console.log('KB Path resolved to:', kbPath);
    try {
        if (!fs.existsSync(kbPath)) {
            console.warn('KB Path does not exist:', kbPath);
            return res.json([]);
        }

        const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.md'));
        console.log('KB files found:', files);
        const articles = files.map(f => {
            const content = fs.readFileSync(path.join(kbPath, f), 'utf8');
            const titleMatch = content.match(/^#\s+(.*)/);
            return {
                id: f,
                title: titleMatch ? titleMatch[1] : f.replace('.md', '').replace(/_/g, ' ')
            };
        });
        res.json(articles);
    } catch (e) {
        console.error('Error reading KB:', e);
        res.json([]);
    }
});

/**
 * GET /api/settings/kb/:id
 * Get Knowledge Base article content
 */
router.get('/kb/:id', (req, res) => {
    const { id } = req.params;
    const kbPath = path.resolve(__dirname, '../../../documentation/knowledge_base', id);

    try {
        // Security check: ensure path is within kb directory
        const resolvedPath = path.resolve(kbPath);
        const baseKbPath = path.resolve(__dirname, '../../../documentation/knowledge_base');
        if (!resolvedPath.startsWith(baseKbPath)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (!fs.existsSync(resolvedPath)) return res.status(404).json({ error: 'Not found' });

        const content = fs.readFileSync(resolvedPath, 'utf8');
        res.send(content);
    } catch (e) {
        console.error('Error reading article:', e);
        res.status(500).send('Error reading article');
    }
});

/**
 * POST /api/settings/ai
 * Save AI Configuration (Encrypted)
 */
router.post('/ai', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;
    const { provider, key } = req.body;

    if (!provider || !key) {
        return res.status(400).json({ error: 'Provider and Key are required' });
    }

    if (!['gemini', 'groq'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
    }

    try {
        const encryptedKey = aiService.encrypt(key);

        const upsert = db.prepare(`
            INSERT INTO settings (key, value, user_id, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key, user_id) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
        `);

        db.transaction(() => {
            upsert.run('ai_provider', provider, userId);
            upsert.run('ai_key', encryptedKey, userId);
        })();

        res.json({ success: true, message: 'AI settings saved securely' });
    } catch (error: any) {
        console.error('Error saving AI settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

/**
 * POST /api/settings/ai/test
 * Test AI Connection
 */
router.post('/ai/test', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { provider, key } = req.body;

    if (!provider || !key) {
        return res.status(400).json({ error: 'Provider and Key are required for test' });
    }

    try {
        // We verify the raw key provided by the user (before saving)
        const success = await aiService.testConnection(provider, key);
        if (success) {
            res.json({ success: true, message: 'Connection successful!' });
        } else {
            console.error('AI Connection Test Failed for provider:', provider); // Debug log
            res.status(400).json({ success: false, error: 'Connection failed. Check server logs for details.' });
        }
    } catch (error: any) {
        console.error('Error testing AI connection:', error);
        res.status(500).json({ error: 'Internal server error during test' });
    }
});

/**
 * GET /api/settings/ai
 * Get current configuration (masked)
 */
router.get('/ai', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = (req.user as any).id;

    try {
        const providerRow = db.prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get('ai_provider', userId) as { value: string };
        const keyRow = db.prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get('ai_key', userId) as { value: string };

        if (providerRow && keyRow) {
            res.json({
                configured: true,
                provider: providerRow.value,
                // Do NOT return the key, even encrypted. Just status.
            });
        } else {
            res.json({ configured: false });
        }
    } catch (error) {
        console.error('Error checking AI settings:', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});

export default router;

