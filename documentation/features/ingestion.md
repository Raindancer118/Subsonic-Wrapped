# 📡 Data Ingestion & Synchronization Engine

Subsonic Wrapped is designed to be a "Passive Ingestion Engine." It aggregates listening data across multiple protocols and vendors, ensuring that your music history is unified and enriched regardless of where it was played.

## 🌉 Ingestion Streams

### 1. ListenBrainz Protocol (Webhooks)
This is the **gold standard** for Subsonic Wrapped. It allows for near real-time, push-based ingestion from modern servers like Navidrome.
-   **Endpoint**: `POST /api/listenbrainz/1/submit-listens`
-   **Mechanism**: The server accepts standard ListenBrainz payloads.
-   **Capabilities**: 
    -   **Now Playing**: Updates the "Live Context" on the dashboard.
    -   **Scrobble Submission**: Inserts permanent entries into `play_history`.
-   **Logic**: Parses `additional_info` for technical metadata like `bitrate`, `codec`, and `release_date`.

### 2. Spotify Polling Engine
A background service that keeps your local database in sync with your Spotify activity.
-   **Method**: `GET /v1/me/player/recently-played`
-   **Interval**: 5 minutes (configurable in `config.yml`).
-   **Sync Strategy**: 
    -   Fetches the last 50 tracks.
    -   Uses a `played_at` timestamp as a primary key to prevent duplication in `play_history`.
    -   Handles token expiration by automatically calling the `refresh_token` flow via the encrypted credentials store.

### 3. Subsonic Polling (Legacy)
Required for servers that do not support webhooks or ListenBrainz.
-   **Method**: `GET /rest/getNowPlaying.view`
-   **Interval**: 2 minutes.
-   **Operation**: 
    -   Actively polls the Subsonic API specifically for the configured user.
    -   Calculates "Listening Time" cumulatively as long as the track remains in the "Now Playing" list on the remote server.

### 4. Direct Scrobble API
A generic endpoint for custom scripts or third-party integrations.
-   **Endpoint**: `POST /api/scrobble`
-   **Payload**: Requires `artist`, `track`, `timestamp`, and `source`.
-   **Deduplication**: Automatically generates a `vendor_id` using the `custom:artist:track` scheme to maintain uniqueness.

---

## ✨ Metadata Enrichment Pipeline

Ingested tracks often have sparse metadata. Subsonic Wrapped runs a background "Enricher" worker for every new track:

1.  **Spotify Search**: Queries the Spotify API using `artist` and `title`.
2.  **Metadata Extraction**: Pulls high-resolution `image_url`, `release_year`, and `genres`.
3.  **AI Fallback**: If Spotify returns no results or missing genres, the system utilizes the configured **AI Integration** (Gemini/Groq) to predict the genre based on the artist's history.
4.  **Database Patching**: Updates the `tracks` table with the newly discovered information, which immediately propagates to the dashboard and "Wrapped" slides.

---

## 💾 Data Schema & Persistence

### The `tracks` Table
Tracks are identified by a `vendor_id`:
-   `spotify:track:ID`
-   `subsonic:track:ID`
-   `scrobble:artist:track` (Normalized)

### The `play_history` Table
Stores every individual "listening event":
-   `user_id`: Reference to the local dashboard user.
-   `track_id`: Reference to the enriched track.
-   `played_at`: ISO timestamp.
-   `listened_duration_ms`: The actual time spent listening (used for "Total Time" stats).
