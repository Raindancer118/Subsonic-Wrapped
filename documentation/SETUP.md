# Setup Guide for Subscription Wrapped (Stats App)

This guide covers how to set up, configure, and run the application using Docker, as well as how to connect your music services (Spotify, Subsonic/Navidrome/Jellyfin).

## Prerequisites
-   [Docker](https://docs.docker.com/get-docker/) & Docker Compose installed on your machine.
-   A **Spotify Developer Account** (for Spotify integration).
-   A running **Subsonic-compatible server** (e.g., Navidrome, Gonic, Jellyfin with plugin) if you want to track self-hosted music.

---

## 1. Spotify Configuration
To fetch your listening history from Spotify, you need to create a Spotify App.

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2.  Log in and click **"Create App"**.
3.  Fill in the App Name (e.g., "My Music Stats") and Description.
4.  Adding **Redirect URI**:
    -   Click on "Settings" (or "Edit Settings").
    -   Under **Redirect URIs**, add:
        ```
        http://localhost:3000/api/auth/spotify/callback
        ```
        *(Note: If you deploy this on a domain, replace `localhost:3000` with your domain).*
5.  Save the settings.
6.  Copy the **Client ID** and **Client Secret**. You will need these for the next step.

---

## 2. Application Configuration (.env)
Create a `.env` file in the `backend/` directory (or root if using the launch script, which copies it).

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your details:

```ini
PORT=3000
NODE_ENV=production

# Security
# Generate a random string for session signing
SESSION_SECRET=super_secure_random_string_here
# Generate a random 32-character string for encryption (AES-256)
ENCRYPTION_KEY=12345678901234567890123456789012

# Spotify (Required if using Spotify)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
```

---

## 3. Running the Application
The application is fully containerized. You can start it using the provided helper script or Docker Compose directly.

### Option A: Using `launch.sh` (Recommended)
This script handles building and starting the containers.

```bash
chmod +x launch.sh
./launch.sh
```

### Option B: Manual Docker Compose
```bash
docker compose up --build -d
```

The application will be available at **http://localhost:3000**.

---

## 4. Connecting Services

### Registering & Connecting Subsonic
1.  Open the app at `http://localhost:3000`.
2.  Click **"Register with Subsonic"** on the login screen.
3.  Fill in:
    -   **App Username/Password**: Credentials you will use to log in to *this* stats app.
    -   **Server URL**: The full URL to your Subsonic server (e.g., `https://music.example.com`).
    -   **Subsonic Username**: Your username on the Subsonic server.
    -   **Subsonic Password/Token**: Your password. 
        -   *Note: Some servers (like Navidrome) support legacy password auth. Others might require a generated "Token" or "App Password". Use that if available.*
4.  Click **Register & Connect**.

### Linking Spotify
1.  Log in to the dashboard.
2.  Click the **"Spotify"** button (or "Link Spotify" in settings if implemented).
3.  You will be redirected to Spotify to authorize the app.
4.  Once authorized, the app will begin polling your "Recently Played" history every 5 minutes.

---

## 5. Feature Usage

### Data Ingestion / Scrobbling
-   **Spotify**: Happens automatically in the background (Polling).
-   **Subsonic**: 
    -   **Now Playing**: The app polls your Subsonic server every 2 minutes to check what you are currently playing.
    -   **Scrobbling**: If your Subsonic client supports "Scrobbling" to a custom URL, you can point it to:
        ```
        POST http://localhost:3000/api/scrobble
        ```
        *Payload (JSON)*:
        ```json
        {
          "artist": "Artist Name",
          "track": "Track Title",
          "timestamp": 1700000000
        }
        ```

### Dashboard
-   **Live Player**: Shows what is currently playing on either service.
-   **Stats**: View today's listening time, total time, and top artists.
-   **History**: Scroll through your recently played tracks.
