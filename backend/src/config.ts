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
} catch (e) {
    console.error('Failed to load config.yml:', e);
    process.exit(1);
}

export default config;
