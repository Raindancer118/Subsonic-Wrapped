# Setup Guide

## Requirements
- Docker & Docker Compose
- Node.js 20+ (for local dev)

## Installation

1.  **Clone the repository**
2.  **Configure**:
    -   Copy `config.yml` (if needed, or just use defaults/env structure).
    -   Ensure `data/` folder exists.
3.  **Launch**:
    ```bash
    ./launch.sh
    ```
    This script builds the docker container and starts the stack.

## Configuration (`config.yml` or Env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | App Port | 3000 |
| `SESSION_SECRET` | Cookie signing secret | - |
| `SPOTIFY_CLIENT_ID` | Spotify API ID | - |
| `SPOTIFY_CLIENT_SECRET` | Spotify API Secret | - |
| `SPOTIFY_REDIRECT_URI` | Auth Callback URL | `.../callback` |

## Multi-Scrobbler Integration (Navidrome)

To route Navidrome scrobbles through Multi-Scrobbler to this application:

1.  **Configure Navidrome**:
    Add the following environment variables to your Navidrome `docker-compose.yml`:
    ```yaml
    ND_LISTENBRAINZ_ENABLED: "true"
    ND_LISTENBRAINZ_BASEURL: "http://multi-scrobbler:9000/api/listenbrainz/" # Internal docker address
    ND_LISTENBRAINZ_APIKEY: "any_token_you_want" # Multi-scrobbler doesn't strictly validate source token unless configured
    ```

2.  **Configure Multi-Scrobbler**:
    The project includes a `multi-scrobbler/config.json` file.
    -   Open the **Settings** page in Subsonic Wrapped (Frontend).
    -   Copy your **ListenBrainz API Token**.
    -   Edit `multi-scrobbler/config.json` and replace `"REPLACE_WITH_YOUR_TOKEN"` with your token.
    -   Restart the multi-scrobbler container: `docker compose restart multi-scrobbler`
