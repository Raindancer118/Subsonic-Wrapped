# Subsonic Wrapped

A powerful, privacy-first, and "Spotify Wrapped"-style application to visualize your listening habits across **Spotify** and **Subsonic-compatible** servers (Navidrome, Jellyfin, Gonic, etc.).

![Dashboard Preview](https://via.placeholder.com/1200x600?text=Subsonic+Wrapped+Dashboard)

## ✨ Features

-   **📊 Unified Statistics**: Seamlessly combine listening history from Spotify and self-hosted libraries.
-   **🚀 Live Dashboard**: Real-time "Now Playing" insights with a stunning, modern dark-mode interface.
-   **📈 Deep Metrics**: Insightful charts for listening time, top artists, tracks, and genre distributions.
-   **🔒 Privacy First**: Completely self-hosted. Your data stays on your hardware. Tokens are encrypted at rest.
-   **🐳 Containerized**: One-command deployment using Docker and Docker Compose.
-   **📱 Responsive**: Works beautifully on desktop, tablet, and mobile browsers.

## 🚀 Quick Start

Ensure you have **Docker** and **Docker Compose** installed.

1.  **Clone & Prepare**:
    ```bash
    git clone https://github.com/tom/subsonic-wrapped.git
    cd subsonic-wrapped
    cp config.example.yml config.yml
    ```
2.  **Configure**:
    Edit `config.yml` with your Spotify API credentials and server details. (See [Setup Guide](documentation/SETUP.md) for details).
3.  **Launch**:
    ```bash
    ./launch.sh
    ```
4.  **Enjoy**:
    Your dashboard is now live at [http://localhost:3000](http://localhost:3000).

## 📚 Documentation

For deep dives into configuration and features, check our documentation:

-   [**Comprehensive Setup Guide**](documentation/SETUP.md)
-   [**Feature Overview**](documentation/features/)
-   [**Security Policy**](rules.md)

## 🛠 Tech Stack

-   **Backend**: Node.js (Express), SQLite (Better-SQLite3)
-   **Frontend**: React (Vite, TypeScript, Tailwind CSS, Framer Motion)
-   **Infrastructure**: Docker, Multi-Scrobbler integration

---
*Built with ❤️ for the self-hosted music community.*
