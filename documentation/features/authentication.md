# Authentication Feature

## Overview
The application supports multiple authentication methods:
1.  **Local Authentication**: Username/Password login for accessing the dashboard.
2.  **Spotify OAuth**: Link a Spotify account to fetch listening history.
3.  **Subsonic Authentication**: Connect to a Subsonic-compatible server (Navidrome, Jellyfin, etc.) using legacy (user/pass) or token-based auth.

## Implementation
-   **Passport.js**: Used for handling Local and Spotify strategies.
-   **Custom Subsonic Auth**: Implemented via direct API verification and token generation.
-   **Session Management**: Express-session with secure cookies (in production).
-   **Encryption**: Sensitive tokens (Spotify Refresh Token, Subsonic Password) are encrypted at rest using AES-256-CBC.

## Endpoints
-   `POST /api/auth/register`: Create a local account.
-   `POST /api/auth/register/subsonic`: Create an account linked to Subsonic.
-   `POST /api/auth/login`: Log in.
-   `POST /api/auth/logout`: Log out.
-   `GET /api/auth/spotify`: Initiate Spotify OAuth flow.
