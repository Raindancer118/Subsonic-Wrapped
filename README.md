# 🎶 Subsonic Wrapped

**Subsonic Wrapped** is a high-performance, privacy-centric analytics engine and visualization platform for your music listening habits. It bridges the gap between decentralized self-hosted music servers (Subsonic, Navidrome, Jellyfin) and mainstream streaming services (Spotify), providing a unified "Year in Review" experience powered by local data and optional AI insights.

![Dashboard Preview](https://via.placeholder.com/1200x600?text=Subsonic+Wrapped+Analytics+Dashboard)

## 💡 Why Subsonic Wrapped?

In an era of data silos, Subsonic Wrapped gives you total ownership of your listening history. It doesn't just display play counts; it analyzes your "Audio Day," tracks your "Listening Age," and uses advanced heuristics to determine your "Musical Personality." 

-   **Zero Tracking**: No external telemetry. Your database stays on your hardware.
-   **Unified Intelligence**: Seamlessly merges scrobbles from Navidrome and polling data from Spotify.
-   **AI-Enhanced**: Optional integration with Gemini or Groq to "roast" your taste or provide poetic vibe checks.

## 🚀 Key Features

### 📊 Advanced Analytics
-   **Deep Metrics**: Track listening duration (ms-precision), top artists, tracks, and albums across custom date ranges (Today, 7D, 30D, Year, All-time).
-   **Temporal Analysis**: Visualize your "Audio Day" (Morning, Afternoon, Evening, Night) and weekly activity patterns.
-   **Technical Insights**: Monitor bitrate distributions, codec usage, and release year "Listening Age."

### 🔌 Intelligent Data Ingestion
-   **Multi-Source Sync**: 
    -   **ListenBrainz Protocol**: Direct integration with Navidrome via the ListenBrainz API.
    -   **Spotify Polling**: Background workers sync your "Recently Played" history every 5 minutes.
    -   **Subsonic Polling**: Real-time "Now Playing" detection for legacy servers.
-   **Metadata Enrichment**: Automatically pulls high-resolution album art, genres, and release years via Spotify API and AI fallback mechanisms.

### 🎭 The "Wrapped" Experience
-   **Story Mode**: A cinematic, slide-based journey through your musical year.
-   **Personality Archetypes**: Are you a "Superfan," an "Explorer," or a "Time Traveler"? Our algorithm calculates your uniqueness and loyalty scores.
-   **AI Roasts**: Get a personalized, snarky critique of your music taste using LLMs.

## 🛠 Technical Architecture

-   **Backend**: Node.js 20+ (Express) with a focus on performant SQLite operations.
-   **Database**: `better-sqlite3` for high-concurrency, low-latency data persistence.
-   **Frontend**: React 19 with Vite, TypeScript, and Tailwind CSS. Modern animations powered by Framer Motion.
-   **Security**: AES-256-GCM encryption for all third-party API keys (Spotify/AI).
-   **Ingestion Engine**: A robust worker system that handles debouncing, scrobble deduplication, and background enrichment.

## 🏁 Quick Start

```bash
# Clone the repository
git clone https://github.com/tom/subsonic-wrapped.git
cd subsonic-wrapped

# Setup configuration
cp config.example.yml config.yml
# Edit config.yml with your secrets

# Launch with Docker
./launch.sh
```

## 📖 Extended Documentation

-   [**🔧 Comprehensive Setup Guide**](documentation/SETUP.md)
-   [**🔐 Authentication & Security**](documentation/features/authentication.md)
-   [**📡 Data Ingestion & Scrobbling**](documentation/features/ingestion.md)
-   [**🧠 AI & LLM Integration**](documentation/features/ai-integration.md)
-   [**✨ The Wrapped Engine**](documentation/features/wrapped.md)
-   [**📈 Dashboard & Stats**](documentation/features/dashboard.md)

---
