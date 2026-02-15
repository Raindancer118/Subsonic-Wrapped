import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const configPath = path.resolve(__dirname, '../../config.yml');

export interface AppConfig {
    app: {
        port: number;
        secret: string;
        env: string;
    };
    database: {
        path: string;
    };
    spotify: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    subsonic?: {
        [key: string]: {
            url: string;
            username: string;
            legacyAuth: boolean;
            useScrobbleOnly?: boolean;
        };
    };
    logging: {
        level: string;
    };
    scrobble: {
        threshold: number;
    };
    polling: {
        spotify: number;
        subsonic: number;
    };
}

let config: AppConfig;

try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(fileContents) as AppConfig;

    console.log('Configuration loaded successfully.');

    // Fallback to Environment Variables if not in config
    if (!config.app.port && process.env.PORT) config.app.port = parseInt(process.env.PORT);
    if (!config.app.secret && process.env.SESSION_SECRET) config.app.secret = process.env.SESSION_SECRET;
    if (!config.app.env && process.env.NODE_ENV) config.app.env = process.env.NODE_ENV;
    if (!config.spotify.clientId && process.env.SPOTIFY_CLIENT_ID) config.spotify.clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!config.spotify.clientSecret && process.env.SPOTIFY_CLIENT_SECRET) config.spotify.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!config.spotify.redirectUri && process.env.SPOTIFY_REDIRECT_URI) config.spotify.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
} catch (e) {
    console.error('Failed to load config.yml:', e);
    process.exit(1);
}

export default config;
