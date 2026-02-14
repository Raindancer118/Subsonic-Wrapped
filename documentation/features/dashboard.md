# Dashboard Feature

## Overview
The Dashboard is the main interface for users to view their listening statistics.

## Components
### Current Playback
-   Displays the currently playing track from either Spotify or Subsonic.
-   Shows album art, track title, artist, and source.
-   Updates in near real-time via polling.

### Quick Stats
-   **Today's Listening Time**: Total duration of tracks played today.
-   **Total Listening Time**: Aggregated duration of all history.

### Charts & Lists
-   **Recently Played**: A scrollable list of the last 50 played tracks with timestamps and source indicators.
-   **Top Artists**: A ranked list of the top 5 most played artists based on play count.

## Technology
-   **Frontend**: React + Vite + Tailwind CSS.
-   **State Management**: React Context (Auth) + Local State (Dashboard Data).
-   **Icons**: Lucide React.
