import express from 'express';
import db from '../database';
import { aiService } from '../services/ai';

const router = express.Router();

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
            res.status(400).json({ success: false, error: 'Connection failed. Please check your key.' });
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
