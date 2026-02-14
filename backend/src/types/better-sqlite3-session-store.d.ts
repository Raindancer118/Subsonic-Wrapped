declare module 'better-sqlite3-session-store' {
    import session from 'express-session';

    interface SqliteStoreOptions {
        client: any;
        expired?: {
            clear?: boolean;
            intervalMs?: number;
        };
    }

    function SqliteStore(
        session: typeof import('express-session')
    ): {
        new(options: SqliteStoreOptions): session.Store;
    };

    export = SqliteStore;
}
