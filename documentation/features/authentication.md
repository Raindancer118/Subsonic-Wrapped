# 🔐 Authentication & Session Security

Subsonic Wrapped implements a multi-layered authentication architecture designed to balance user convenience with high-security standards for third-party service integration.

## 🏛 Auth Architecture

The system supports three primary authentication domains, each handled with specific security protocols:

### 1. Local Application Authentication
This is the primary gateway to the dashboard.
-   **Implementation**: Utilizes `Passport.js` with the `passport-local` strategy.
-   **Password Hashing**: Passwords are never stored in plain text. We use `bcrypt` with a cost factor of `10` to generate salted hashes.
-   **Validation**: Inputs are strictly validated on the server-side using `zod` schemas to prevent injection and malformed data.

### 2. Spotify OAuth 2.0
Used for synchronizing "Recently Played" tracks and fetching enriched metadata.
-   **Protocol**: Standard OAuth Authorization Code Flow.
-   **Scopes Request**: 
    -   `user-read-recently-played`: To sync history.
    -   `user-read-currently-playing`: For live dashboard updates.
    -   `user-top-read`: For "Wrapped" analytics.
-   **Security**: Upon callback, the `access_token` and `refresh_token` are encrypted at rest (see [Encryption](#-encryption-at-rest)).

### 3. Subsonic/Navidrome Integration
Connects to your self-hosted music libraries.
-   **Supported Methods**:
    -   **Legacy Auth**: Plaintext or MD5 hashing for older Subsonic forks.
    -   **Token Auth (Recommended)**: Uses the `v1.16.1` salt+token method.
-   **Credential Safety**: Subsonic passwords or tokens are encrypted before being stored in the SQLite database.

---

## 🔒 Security Mechanisms

### Encryption at Rest (AES-256-GCM)
Subsonic Wrapped uses the `app.secret` from your `config.yml` to derive a 256-bit master key. 
-   **Algorithm**: `aes-256-gcm` (Authenticated Encryption).
-   **Component**: All tokens stored in the `subsonic_servers` and `users` (Spotify) tables are encrypted.
-   **Integrity**: GCM (Galois/Counter Mode) ensures that if an encrypted token is tampered with in the database, decryption will fail instead of returning corrupted data.

### Session Management
-   **Storage**: Sessions are persisted in the SQLite database using `better-sqlite3-session-store`.
-   **Properties**:
    -   `HttpOnly`: Prevents Cross-Site Scripting (XSS) from accessing session IDs.
    -   `Secure`: Required in production; ensures sessions are only transmitted over HTTPS.
    -   `SameSite: Lax`: Protects against Cross-Site Request Forgery (CSRF) while allowing cross-domain redirects (essential for Spotify OAuth).

### ListenBrainz API Tokens
Every user is automatically assigned a unique ListenBrainz-compatible API token upon registration.
-   **Format**: 32-character hex string.
-   **Usage**: Used by external scrobblers (like Navidrome or Multi-Scrobbler) to POST data to the `/api/listenbrainz` endpoint without requiring session-based authentication.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | standard registration logic with validation. |
| `POST` | `/api/auth/register/subsonic` | Specialized registration that verifies a Subsonic server connection immediately. |
| `POST` | `/api/auth/login` | Local login; initializes the session and backfills ListenBrainz tokens. |
| `GET` | `/api/auth/spotify` | Redirects the user to Spotify for authorization. |
| `GET` | `/api/auth/spotify/callback` | Handles the return from Spotify, exchanges codes for tokens, and encrypts them. |
| `GET` | `/api/auth/me` | Returns the current session user details (sanitized). |
