import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from './config';

const dbPath = config.app.env === 'production'
    ? '/app/data/app.db' // Docker volume mount point
    : path.resolve(__dirname, '../../', config.database.path);

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
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            spotify_access_token TEXT,
            spotify_refresh_token TEXT,
            subsonic_url TEXT,
            subsonic_auth TEXT, -- Encrypted JSON { username, token/password, salt }
            listenbrainz_token TEXT UNIQUE, -- Generated API Token for external scrobblers
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tracks (
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
            raw_data TEXT, -- JSON string of full API response
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS play_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            played_at DATETIME NOT NULL,
            source TEXT NOT NULL, -- "spotify", "subsonic", "scrobble"
            listened_duration_ms INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (track_id) REFERENCES tracks(id),
            UNIQUE(user_id, track_id, played_at) -- Prevent absolute duplicates
        );

        CREATE INDEX IF NOT EXISTS idx_play_history_user_played ON play_history(user_id, played_at);
        CREATE INDEX IF NOT EXISTS idx_tracks_vendor ON tracks(vendor_id);

        CREATE TABLE IF NOT EXISTS subsonic_servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT,
            url TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `;

    const settingsSchema = `
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (key, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `;

    db.exec(schema);
    db.exec(settingsSchema);

    // Migrations because SQLite doesn't support IF NOT EXISTS for columns in CREATE TABLE
    // We just try to add them and ignore errors if they exist (simplest for this dev setup)
    // ideally we'd use a proper migration tool
    try { db.prepare('ALTER TABLE tracks ADD COLUMN year INTEGER').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (year):', e.message); }
    try { db.prepare('ALTER TABLE tracks ADD COLUMN genre TEXT').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (genre):', e.message); }
    try { db.prepare('ALTER TABLE tracks ADD COLUMN bitrate INTEGER').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (bitrate):', e.message); }
    try { db.prepare('ALTER TABLE tracks ADD COLUMN codec TEXT').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (codec):', e.message); }
    try { db.prepare('ALTER TABLE tracks ADD COLUMN track_number INTEGER').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (track_number):', e.message); }
    try { db.prepare('ALTER TABLE tracks ADD COLUMN disc_number INTEGER').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (disc_number):', e.message); }
    try { db.prepare('ALTER TABLE play_history ADD COLUMN listened_duration_ms INTEGER DEFAULT 0').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (listened_duration_ms):', e.message); }
    try { db.prepare('ALTER TABLE tracks ADD COLUMN raw_data TEXT').run(); } catch (e: any) { if (!e.message.includes('duplicate column')) console.error('Migration error (raw_data):', e.message); }
    try {
        db.prepare('ALTER TABLE users ADD COLUMN listenbrainz_token TEXT').run();
    } catch (e: any) {
        if (!e.message.includes('duplicate column')) console.error('Migration error (listenbrainz_token column):', e.message);
    }

    try {
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lb_token ON users(listenbrainz_token)').run();
    } catch (e: any) {
        console.error('Migration error (listenbrainz_token index):', e.message);
    }

    try {
        // Safe migration for table creation (already handled by CREATE TABLE IF NOT EXISTS above, but ensuring)
    } catch (e) { }

    try {
        const usersWithSubsonic = db.prepare("SELECT id, subsonic_url, subsonic_auth FROM users WHERE subsonic_url IS NOT NULL").all() as any[];
        if (usersWithSubsonic.length > 0) {
            const insertServer = db.prepare("INSERT INTO subsonic_servers (user_id, url, auth) VALUES (?, ?, ?)");
            const clearUser = db.prepare("UPDATE users SET subsonic_url = NULL, subsonic_auth = NULL WHERE id = ?");
            db.transaction(() => {
                for (const user of usersWithSubsonic) {
                    insertServer.run(user.id, user.subsonic_url, user.subsonic_auth);
                    clearUser.run(user.id);
                }
            })();
        }
    } catch (e) { console.error("Migration failed:", e); }

    console.log('Database initialized.');
}

export default db;
