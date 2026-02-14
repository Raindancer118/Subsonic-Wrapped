"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const passport_spotify_1 = require("passport-spotify");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("./database"));
const config_1 = __importDefault(require("./config"));
const encryption_1 = require("./utils/encryption");
// Local Strategy
passport_1.default.use(new passport_local_1.Strategy(async (username, password, done) => {
    try {
        const user = database_1.default.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }
        const match = await bcrypt_1.default.compare(password, user.password_hash);
        if (!match) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
    }
    catch (err) {
        return done(err);
    }
}));
// Spotify Strategy
if (config_1.default.spotify.clientId && config_1.default.spotify.clientSecret) {
    passport_1.default.use(new passport_spotify_1.Strategy({
        clientID: config_1.default.spotify.clientId,
        clientSecret: config_1.default.spotify.clientSecret,
        callbackURL: config_1.default.spotify.redirectUri,
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, expires_in, profile, done) => {
        try {
            if (!req.user) {
                return done(null, false, { message: 'Login required before linking Spotify' });
            }
            const userId = req.user.id;
            const encryptedAccess = (0, encryption_1.encrypt)(accessToken);
            const encryptedRefresh = (0, encryption_1.encrypt)(refreshToken);
            database_1.default.prepare('UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ? WHERE id = ?')
                .run(encryptedAccess, encryptedRefresh, userId);
            done(null, req.user);
        }
        catch (err) {
            done(err);
        }
    }));
}
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => {
    try {
        const user = database_1.default.prepare('SELECT id, username FROM users WHERE id = ?').get(id);
        done(null, user);
    }
    catch (err) {
        done(err);
    }
});
exports.default = passport_1.default;
//# sourceMappingURL=auth.js.map