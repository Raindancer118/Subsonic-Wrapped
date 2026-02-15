import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import session from 'express-session';
import passport from './auth';
import config from './config';
import { initDatabase } from './database';

// Routes
import authRoutes from './routes/auth';
import scrobbleRoutes from './routes/scrobble';
import playerRoutes from './routes/player';
import statsRoutes from './routes/stats';
import listenbrainzRoutes from './routes/listenbrainz';
import settingsRoutes from './routes/settings';

// Services
import { pollSpotifyRecentlyPlayed } from './services/spotify';
import { pollSubsonicNowPlaying } from './services/subsonic';

const app = express();

// Initialize DB
initDatabase();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false
}));
app.use(cors({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true
}));
app.use(express.json());
import SqliteStore from 'better-sqlite3-session-store';
import db from './database';

const SessionStore = (SqliteStore as any)(session);

app.set('trust proxy', 1); // Trust first proxy

app.use(session({
    store: new SessionStore({
        client: db,
        expired: {
            clear: true,
            intervalMs: 900000 // 15min
        }
    }),
    secret: config.app.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Allow over HTTP for now (User accessing via IP)
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scrobble', scrobbleRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/listenbrainz', listenbrainzRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api', (req: Request, res: Response) => {
    res.send('Spotify/Subsonic Stats API');
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Start Background Jobs
if (config.app.env !== 'test') { // Don't start in tests
    console.log('Starting background polling services...');
    // Initial Run
    setTimeout(() => {
        pollSpotifyRecentlyPlayed().catch(console.error);
        pollSubsonicNowPlaying().catch(console.error);
    }, 5000);

    // Schedule
    setInterval(pollSpotifyRecentlyPlayed, config.polling.spotify * 1000);
    setInterval(pollSubsonicNowPlaying, config.polling.subsonic * 1000);
}

// Serve Frontend in Production
if (config.app.env === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
    app.get(/.*/, (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });
}

app.listen(config.app.port, () => {
    console.log(`Server running on port ${config.app.port} in ${config.app.env} mode`);
});
