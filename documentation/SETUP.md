# 🛠 Setup Guide

Follow these instructions to get your Subsonic Wrapped instance up and running.

## 📋 Requirements

-   **Docker** & **Docker Compose**
-   **Spotify Developer Account** (to create an App and get credentials)
-   **Subsonic-compatible server** (Navidrome, Jellyfin, Gonic, etc.)
-   **Node.js 20+** (Optional: only if you want to develop locally)

## 🚀 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/tom/subsonic-wrapped.git
    cd subsonic-wrapped
    ```

2.  **Initialize Configuration**:
    ```bash
    cp config.example.yml config.yml
    mkdir -p data
    ```

3.  **Configure the Application**:
    Open `config.yml` in your favorite editor and fill in the required fields. (See [Configuration](#-configuration) below).

4.  **Launch**:
    ```bash
    ./launch.sh
    ```
    The `launch.sh` script will automatically:
    -   Extract the port from your `config.yml`.
    -   Build the Docker container.
    -   Start the stack using Docker Compose.

5.  **Access the Dashboard**:
    Navigate to `http://localhost:3000` (or the port you configured).

---

## ⚙️ Configuration

The `config.yml` file is the heart of the application. You can also use environment variables in your `docker-compose.yml` to override these values.

### 🌐 App Settings
| Variable | Description | Default |
| :--- | :--- | :--- |
| `app.port` | The port the application will listen on. | `3000` |
| `app.secret` | A long, random string used for session signing and encryption. | `change_me` |
| `app.env` | Environment mode (`production` or `development`). | `production` |

### 📂 Database Settings
| Variable | Description | Default |
| :--- | :--- | :--- |
| `database.path` | Path to the SQLite database file. | `./data/app.db` |

### 🎵 Spotify Integration
| Variable | Description | Note |
| :--- | :--- | :--- |
| `spotify.clientId` | Your Spotify Client ID. | Get from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). |
| `spotify.clientSecret` | Your Spotify Client Secret. | |
| `spotify.redirectUri` | Must match the URI in your Spotify App settings. | e.g., `https://your-domain.com/api/auth/spotify/callback` |

> [!IMPORTANT]
> Spotify's API requires a valid `redirectUri`. Localhost is supported for development, but ensure it matches exactly in both the dashboard and your `config.yml`.

### 📂 Subsonic Servers
You can add multiple servers under the `subsonic` key:
```yaml
subsonic:
  my_navidrome:
    url: "https://music.example.com"
    username: "your_username"
    legacyAuth: false # Use true for older Subsonic versions (MD5 auth)
    useScrobbleOnly: true # Highly recommended: rely on incoming scrobbles
```

---

## 📻 Multi-Scrobbler Integration

To sync your listening history from Navidrome/Jellyfin in real-time, use the included **Multi-Scrobbler** setup.

1.  **Get your API Token**:
    -   Open the Subsonic Wrapped Dashboard.
    -   Go to **Settings**.
    -   Copy your **ListenBrainz API Token**.

2.  **Configure Multi-Scrobbler**:
    -   Open `multi-scrobbler/config.json`.
    -   Replace `"REPLACE_WITH_YOUR_TOKEN"` with your token.
    -   Restart the scrobbler: `docker compose restart multi-scrobbler`.

3.  **Navidrome Webhook**:
    Add these variables to your Navidrome `docker-compose.yml`:
    ```yaml
    ND_LISTENBRAINZ_ENABLED: "true"
    ND_LISTENBRAINZ_BASEURL: "http://multi-scrobbler:9000/api/listenbrainz/"
    ND_LISTENBRAINZ_APIKEY: "any_token"
    ```

---

## 🛡 Security Best Practices

As per project standards, we prioritize security:

1.  **Secrets Management**: Never hardcode secrets. Use `config.yml` (git-ignored) or environment variables.
2.  **Encryption**: All sensitive tokens (Spotify OAuth) are encrypted at rest using your `app.secret`.
3.  **Least Privilege**: The application runs under a non-root user within the container.
4.  **Production Readiness**: Always change the `app.secret` to a strong random string before deploying to production.

---

## ❓ Troubleshooting

-   **Spotify Auth Fails**: Verify your `redirectUri` matches exactly in the Spotify Developer Dashboard.
-   **Scrobbles not appearing**: Ensure the Multi-Scrobbler container is running and the token in `multi-scrobbler/config.json` is correct.
-   **Port Conflict**: Change `app.port` in `config.yml` and restart with `./launch.sh`.
