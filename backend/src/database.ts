import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from './config';

const dbPath = path.resolve(__dirname, '../../', config.database.path);
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db: Database.Database = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initDatabase() {
    console.log('Initializing database...');

    const schema = `
        db.exec(`
            CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        spotify_access_token TEXT,
        spotify_refresh_token TEXT,
        subsonic_url TEXT,
        subsonic_auth TEXT, --Encrypted JSON { username, token/ password, salt }
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tracks(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id TEXT UNIQUE NOT NULL, -- "spotify:track:xyz" or "subsonic:id:123"
                title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            duration_ms INTEGER,
            image_url TEXT,
            year INTEGER,
            genre TEXT,
            bitrate INTEGER,
            codec TEXT,
            track_number INTEGER,
            disc_number INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

            CREATE TABLE IF NOT EXISTS play_history(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            played_at DATETIME NOT NULL,
            source TEXT NOT NULL, -- "spotify", "subsonic", "scrobble"
                listened_duration_ms INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(track_id) REFERENCES tracks(id),
            UNIQUE(user_id, track_id, played_at)-- Prevent absolute duplicates
        );

            CREATE INDEX IF NOT EXISTS idx_play_history_user_played ON play_history(user_id, played_at);
            CREATE INDEX IF NOT EXISTS idx_tracks_vendor ON tracks(vendor_id);

--Migrations because SQLite doesn't support IF NOT EXISTS for columns in CREATE TABLE
--We just try to add them and ignore errors if they exist(simplest for this dev setup)
    --ideally we'd use a proper migration tool
        `);

        try { db.prepare('ALTER TABLE tracks ADD COLUMN year INTEGER').run(); } catch (e) {}
        try { db.prepare('ALTER TABLE tracks ADD COLUMN genre TEXT').run(); } catch (e) {}
        try { db.prepare('ALTER TABLE tracks ADD COLUMN bitrate INTEGER').run(); } catch (e) {}
        try { db.prepare('ALTER TABLE tracks ADD COLUMN codec TEXT').run(); } catch (e) {}
        try { db.prepare('ALTER TABLE tracks ADD COLUMN track_number INTEGER').run(); } catch (e) {}
        try { db.prepare('ALTER TABLE tracks ADD COLUMN disc_number INTEGER').run(); } catch (e) {}
        try { db.prepare('ALTER TABLE play_history ADD COLUMN listened_duration_ms INTEGER DEFAULT 0').run(); } catch (e) {}
    console.log('Database initialized.');
}

export default db;
