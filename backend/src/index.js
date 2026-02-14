"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const express_session_1 = __importDefault(require("express-session"));
const auth_1 = __importDefault(require("./auth"));
const config_1 = __importDefault(require("./config"));
const database_1 = require("./database");
// Routes
const auth_2 = __importDefault(require("./routes/auth"));
const scrobble_1 = __importDefault(require("./routes/scrobble"));
const player_1 = __importDefault(require("./routes/player"));
const stats_1 = __importDefault(require("./routes/stats"));
// Services
const spotify_1 = require("./services/spotify");
const subsonic_1 = require("./services/subsonic");
const app = (0, express_1.default)();
// Initialize DB
(0, database_1.initDatabase)();
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false // Disable CSP for now to allow external images/scripts if needed avoiding strict headaches in dev
}));
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: config_1.default.app.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config_1.default.app.env === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));
app.use(auth_1.default.initialize());
app.use(auth_1.default.session());
// Routes
app.use('/api/auth', auth_2.default);
app.use('/api/scrobble', scrobble_1.default);
app.use('/api/player', player_1.default);
app.use('/api/stats', stats_1.default);
app.get('/api', (req, res) => {
    res.send('Spotify/Subsonic Stats API');
});
// Start Background Jobs
if (config_1.default.app.env !== 'test') { // Don't start in tests
    console.log('Starting background polling services...');
    // Initial Run
    setTimeout(() => {
        (0, spotify_1.pollSpotifyRecentlyPlayed)().catch(console.error);
        (0, subsonic_1.pollSubsonicNowPlaying)().catch(console.error);
    }, 5000);
    // Schedule
    setInterval(spotify_1.pollSpotifyRecentlyPlayed, config_1.default.polling.spotify * 1000);
    setInterval(subsonic_1.pollSubsonicNowPlaying, config_1.default.polling.subsonic * 1000);
}
// Serve Frontend in Production
if (config_1.default.app.env === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
    });
}
app.listen(config_1.default.app.port, () => {
    console.log(`Server running on port ${config_1.default.app.port} in ${config_1.default.app.env} mode`);
});
//# sourceMappingURL=index.js.map