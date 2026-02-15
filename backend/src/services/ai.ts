import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import crypto from 'crypto';
import config from '../config';
import db from '../database';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * AI Service for handling LLM interactions (Gemini/Groq)
 * securely using encrypted API keys.
 */
export class AIService {
    private secret: Buffer;

    constructor() {
        // Derive a 32-byte key from the app secret using a fixed salt (for reproducibility)
        // In a real production scenario, we might want per-user keys, but app-level is sufficient for this scope.
        // We use a fixed salt here because config.app.secret IS the master key.
        this.secret = crypto.scryptSync(config.app.secret, 'subsonic-wrapped-salt', 32);
    }

    /**
     * Encrypts a plain text API key.
     * Returns "iv:authTag:encryptedData"
     */
    encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.secret, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypts an encrypted API key.
     */
    decrypt(encryptedText: string): string {
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 3) throw new Error('Invalid format');

            const ivHex = parts[0];
            const tagHex = parts[1];
            const encryptedHex = parts[2];

            if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid format components');

            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');
            const encrypted = Buffer.from(encryptedHex, 'hex');

            const decipher = crypto.createDecipheriv(ALGORITHM, this.secret, iv);
            decipher.setAuthTag(tag);

            const decryptedBuffer = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);

            return decryptedBuffer.toString('utf8');
        } catch (e) {
            console.error("Decryption failed:", e);
            throw new Error("Failed to decrypt API key");
        }
    }

    /**
     * Get configured provider and key for a user
     */
    getConfig(userId: number): { provider: 'gemini' | 'groq', key: string } | null {
        // We'll store this in a simple settings table: key='ai_provider', value='gemini', user_id=...
        // For simplicity in this project, we can assume a single user or store in user meta.
        // Let's use a new table `user_settings` or just generic key-value store.
        // Assuming we add a `getSetting` helper later. For now, direct DB query.

        const providerRow = db.prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get('ai_provider', userId) as { value: string };
        const keyRow = db.prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get('ai_key', userId) as { value: string };

        if (!providerRow || !keyRow) return null;

        try {
            return {
                provider: providerRow.value as 'gemini' | 'groq',
                key: this.decrypt(keyRow.value)
            };
        } catch (e) {
            return null; // Key likely invalid/corrupted
        }
    }

    /**
     * Generate text using the configured AI provider.
     */
    async generateText(userId: number, prompt: string, systemContext?: string): Promise<string> {
        const config = this.getConfig(userId);
        if (!config) throw new Error("AI not configured");

        const fullPrompt = systemContext ? `${systemContext}\n\nUser Request: ${prompt}` : prompt;

        try {
            if (config.provider === 'gemini') {
                const genAI = new GoogleGenerativeAI(config.key);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                return response.text();
            } else if (config.provider === 'groq') {
                const groq = new Groq({ apiKey: config.key });
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemContext || "You are a helpful assistant." },
                        { role: "user", content: prompt }
                    ],
                    model: "mixtral-8x7b-32768",
                });
                return completion.choices[0]?.message?.content || "";
            } else {
                throw new Error("Unknown provider");
            }
        } catch (e: any) {
            console.error("AI Generation Error:", e);
            throw new Error(`AI generation failed: ${e.message}`);
        }
    }

    /**
     * Just tests the connection with a simple prompt
     */
    async testConnection(provider: 'gemini' | 'groq', key: string): Promise<boolean> {
        try {
            if (provider === 'gemini') {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                await model.generateContent("Hello");
                return true;
            } else if (provider === 'groq') {
                const groq = new Groq({ apiKey: key });
                await groq.chat.completions.create({
                    messages: [{ role: "user", content: "Hello" }],
                    model: "llama3-8b-8192", // Use small model for test
                });
                return true;
            }
            return false;
            return false;
        } catch (e: any) {
            console.error("Test Connection Failed Detailed:", e.message, e.response?.data);
            return false;
        }
    }
}

export const aiService = new AIService();
