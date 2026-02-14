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
declare let config: AppConfig;
export default config;
//# sourceMappingURL=config.d.ts.map