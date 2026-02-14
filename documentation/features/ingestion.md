# Data Ingestion

## Overview
The application ingests listening data from multiple sources to provide a unified history.

## Sources
### Spotify
-   **Method**: Polling `recently-played` endpoint.
-   **Frequency**: Every 5 minutes.
-   **Logic**: Fetches last 50 tracks, inserts new ones into `tracks` table, and records plays in `play_history` table (ignoring duplicates via unique constraints).

### Subsonic
-   **Method**: Polling `getNowPlaying.view` endpoint.
-   **Frequency**: Every 2 minutes.
-   **Logic**: Checks for current playback status. Used for "Now Playing" display. 
-   **Future Work**: Implement comprehensive history import or utilize `scrobble` endpoint on the client side.

### Universal Scrobble
-   **Method**: `POST /api/scrobble` endpoint.
-   **Usage**: Allows external clients or scripts to push listening history manually.
-   **Format**: JSON payload with artist, track, album, duration, and timestamp.

## Data Model
-   **Tracks**: Stored with a unique `vendor_id` (e.g., `spotify:track:123`, `subsonic:track:456`).
-   **History**: Linked to User and Track with a timestamp.
