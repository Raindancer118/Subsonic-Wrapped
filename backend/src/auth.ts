import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import bcrypt from 'bcrypt';
import db from './database';
import config from './config';
import { encrypt } from './utils/encryption';

interface User {
    id: number;
    username: string;
    password_hash: string;
}

// Local Strategy
passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Spotify Strategy
if (config.spotify.clientId && config.spotify.clientSecret) {
    passport.use(new SpotifyStrategy({
        clientID: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        callbackURL: config.spotify.redirectUri,
        passReqToCallback: true
    }, async (req: any, accessToken: string, refreshToken: string, expires_in: number, profile: any, done: Function) => {
        try {
            if (!req.user) {
                return done(null, false, { message: 'Login required before linking Spotify' });
            }

            const userId = req.user.id;
            const encryptedAccess = encrypt(accessToken);
            const encryptedRefresh = encrypt(refreshToken);

            db.prepare('UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ? WHERE id = ?')
                .run(encryptedAccess, encryptedRefresh, userId);

            done(null, req.user);
        } catch (err) {
            done(err);
        }
    }));
}

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    try {
        const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(id) as User | undefined;
        done(null, user);
    } catch (err) {
        done(err);
    }
});

export default passport;
