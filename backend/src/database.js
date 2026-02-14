"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("./config"));
const dbPath = path_1.default.resolve(__dirname, '../../', config_1.default.database.path);
const dbDir = path_1.default.dirname(dbPath);
// Ensure data directory exists
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const db = new better_sqlite3_1.default(dbPath);
db.pragma('journal_mode = WAL');
function initDatabase() {
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS play_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            played_at DATETIME NOT NULL,
            source TEXT NOT NULL, -- "spotify", "subsonic", "scrobble"
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (track_id) REFERENCES tracks(id),
            UNIQUE(user_id, track_id, played_at) -- Prevent absolute duplicates
        );

        CREATE INDEX IF NOT EXISTS idx_play_history_user_played ON play_history(user_id, played_at);
        CREATE INDEX IF NOT EXISTS idx_tracks_vendor ON tracks(vendor_id);
    `;
    db.exec(schema);
    console.log('Database initialized.');
}
exports.default = db;
//# sourceMappingURL=database.js.map