# 🛠 Comprehensive Setup & Deployment Guide

This guide provides exhaustive instructions for deploying, configuring, and maintaining your Subsonic Wrapped instance.

## 📋 Prerequisites

### System Requirements
- **Docker Engine**: 24.0.0+
- **Docker Compose**: 2.20.0+ (V2 is required)
- **Memory**: Minimum 512MB RAM (1GB recommended for AI features)
- **Storage**: ~200MB for the application images plus database growth (SQLite).

### External Accounts
- **Spotify Developer**: Required for the Spotify integration.
- **Subsonic Server**: Navidrome (recommended), Jellyfin, or Gonic.
- **AI Provider**: Gemini (Google AI Studio) or Groq API (Optional).

---

## 🚀 Deployment Methods

### Method 1: Pull from GitHub Container Registry (Recommended)
This is the standard way to deploy Subsonic Wrapped. It uses our pre-built, optimized images.

#### via Docker Compose
Create a `docker-compose.yml`:
```yaml
services:
  app:
    image: ghcr.io/raindancer118/subsonic-wrapped:latest
    ports:
      - "3000:3000"
    volumes:
      - ./config.yml:/app/config.yml
      - ./data:/app/data
    restart: unless-stopped
```

#### via Docker Run
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/config.yml:/app/config.yml \
  -v $(pwd)/data:/app/data \
  --name subsonic-wrapped \
  ghcr.io/raindancer118/subsonic-wrapped:latest
```

### Method 2: Build from Source (Development)
Use this if you want to modify the application or contribute.

1.  **Repository Initialization**
    ```bash
    git clone https://github.com/Raindancer118/Subsonic-Wrapped.git
    cd Subsonic-Wrapped
    mkdir -p data
    ```

2.  **Launch with Local Build**
    The provided `launch.sh` will build the image locally and start the services.
    ```bash
    cp config.example.yml config.yml
    chmod +x launch.sh
    ./launch.sh
    ```

---

## ⚙️ Configuration Reference (`config.yml`)

### 🌐 Application Core (`app:`)
| Key | Type | Description |
| :--- | :--- | :--- |
| `port` | Integer | The internal and external port for the web server (Default: `3000`). |
| `secret` | String | **Critical**: Used for session signing and AES-256-GCM encryption of your API keys. |
| `env` | String | `production` or `development`. Affects logging verbosity and error exposure. |

### 📂 Persistence (`database:`)
| Key | Type | Description |
| :--- | :--- | :--- |
| `path` | String | Path to the SQLite database. Usually `./data/app.db`. |

### 🎵 Spotify Integration (`spotify:`)
To enable Spotify, create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
| Key | Description |
| :--- | :--- |
| `clientId` | Your Spotify Application Client ID. |
| `clientSecret` | Your Spotify Application Client Secret. |
| `redirectUri` | The callback URL. **Must match exactly** in the Spotify Dashboard. (e.g., `https://wrapped.example.com/api/auth/spotify/callback`) |

### 📡 Subsonic Servers (`subsonic:`)
You can define multiple servers as a dictionary.
```yaml
subsonic:
  primary:
    url: "https://navidrome.yoursite.com"
    username: "music_user"
    legacyAuth: false # Use true only for very old Subsonic forks.
    useScrobbleOnly: true # Recommended: Disables polling and relies on webhook pushes.
```

### ⏲️ Polling & Sync (`polling:`)
| Key | Default | Description |
| :--- | :---: | :--- |
| `spotify` | `300` | Seconds between "Recently Played" syncs (min: 60). |
| `subsonic` | `120` | Seconds between "Now Playing" checks if `useScrobbleOnly` is false. |

---

## 📻 Advanced Ingestion: Multi-Scrobbler

Subsonic Wrapped includes a dedicated integration for real-time scrobbling via the ListenBrainz protocol.

### 1. Token Generation
1. Log in to your Subsonic Wrapped instance.
2. Navigate to **Settings** > **Developer**.
3. Copy your unique **ListenBrainz API Token**.

### 2. Multi-Scrobbler Setup
Modify `multi-scrobbler/config.json`:
```json
{
  "scrobblers": [
    {
      "type": "listenbrainz",
      "name": "Subsonic Wrapped",
      "token": "YOUR_COPIED_TOKEN",
      "url": "http://app:3000/api/listenbrainz"
    }
  ]
}
```

### 3. Server-Side Webhook (Navidrome)
Add these environment variables to your Navidrome container:
```yaml
ND_LISTENBRAINZ_ENABLED: "true"
ND_LISTENBRAINZ_BASEURL: "http://multi-scrobbler:9000/api/listenbrainz/"
ND_LISTENBRAINZ_APIKEY: "any_string"
```

---

## 🛡 Security & Hardening

1. **Session Secrets**: Ensure `app.secret` is a cryptographically strong string. Changing this will invalidate all existing sessions and API key encryptions.
2. **Reverse Proxy**: It is highly recommended to run this behind **Nginx**, **Traefik**, or **Caddy** with TLS.
3. **Internal Auth**: Subsonic Wrapped uses `Passport.js` with `express-session`. In production, cookies are set to `HttpOnly` and `SameSite: Lax`.

## ❓ Troubleshooting

### Spotify Auth Redirect Loop
- Ensure `redirectUri` in `config.yml` is identical to what is in the Spotify Dashboard.
- If using a reverse proxy, ensure `X-Forwarded-Proto: https` is correctly set.

### Database is Locked
- This can happen if multiple processes access the SQLite file. Ensure only one instance of the `app` container is running.
- In Docker, ensure the `data/` volume has correct permissions (`UID 1000` is usually required for Node.js containers).

### Missing Album Art
- Check server logs. This usually indicates that the Spotify Client Credentials flow is failing or the API key is invalid.
