# Subsonic Wrapped / Stats App

A comprehensive "Spotify Wrapped" style application for tracking your listening habits across **Spotify** and **Subsonic** (Navidrome, Jellyfin, Gonic) servers.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Preview)

## Features
-   **Unified Statistics**: Combine listening history from Spotify and self-hosted servers.
-   **Live Dashboard**: See what's playing right now with a modern, dark-mode UI.
-   **Detailed Metrics**: Track listening time (Today/All-time), Top Artists, and Recent History.
-   **Privacy Focused**: Self-hosted, encrypted tokens, local database (SQLite).
-   **Dockerized**: Easy deployment with Docker Compose.

## quick Start

1.  **Configure**: Set up `backend/.env` (see [Setup Guide](documentation/SETUP.md)).
2.  **Launch**:
    ```bash
    ./launch.sh
    ```
3.  **Access**: Open [http://localhost:3000](http://localhost:3000).

## Documentation
-   [**Full Setup Guide**](documentation/SETUP.md): Detailed instructions for connecting Spotify and Subsonic.
-   [**Features**](documentation/features/):
    -   [Authentication](documentation/features/authentication.md)
    -   [Dashboard](documentation/features/dashboard.md)
    -   [Data Ingestion](documentation/features/ingestion.md)

## Tech Stack
-   **Backend**: Node.js, Express, SQLite (Better-Quality), Passport.js
-   **Frontend**: React, Vite, Tailwind CSS, Recharts
-   **Deployment**: Docker, GHCR Actions
