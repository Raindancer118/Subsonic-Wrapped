# 📊 Dashboard & Analytics Engine

The Subsonic Wrapped dashboard provides a high-fidelity, real-time visualization of your listening ecosystem. It aggregates data from multiple ingestion streams into a unified, interactive interface.

## 🧱 Dashboard Modules

### 1. Live Context (Now Playing)
-   **Functionality**: Merges real-time "Now Playing" signals from Spotify Web API and Subsonic's `getNowPlaying.view`.
-   **Ingestion Priority**: Subsonic Wrapped prioritized the most recently detected active stream.
-   **Metadata**: Displays artist, track title, album, high-resolution cover art, and a source-specific badge (e.g., Spotify vs. Navidrome).

### 2. Summary Analytics
-   **Today's Milestone**: Aggregates `listened_duration_ms` for all tracks played since `00:00:00` local time.
-   **All-Time Accumulator**: A lifetime counter of total minutes listened.
-   **Play Count Index**: Total number of scrobbles recorded in the database.

### 3. Temporal Activity (Extended Stats)
-   **Audio Day Distribution**: Categorization of listening habits into four segments:
    -   🌅 **Morning**: 05:00 - 11:59
    -   ☀️ **Afternoon**: 12:00 - 17:59
    -   🌆 **Evening**: 18:00 - 23:59
    -   🌙 **Night**: 00:00 - 04:59
-   **Weekly Heatmap**: Visualization of play frequency by weekday to identify peak listening days.

### 4. Categorical Ranking
-   **Artist Infinity**: A ranked list of your most-played artists.
-   **Genre Cloud**: Analyzes the `genre` metadata (enriched by Spotify and AI) to show your musical diversity.
-   **Year Distribution**: Visualizes the release era of your tracks (e.g., "70s Rock" vs. "Modern Pop").

---

## 📐 Data Calculation Logic

### Duration Rounding
While the database stores duration in **milliseconds**, the dashboard converts these to **minutes** or **hours** using a flooring algorithm for readability, specifically:
`Total Minutes = floor(sum(duration_ms) / 60000)`

### Playback Thresholds
To ensure statistics are meaningful, the engine applies a **30-second filter**:
-   Any play attempt shorter than 30,000ms is stored in history but **excluded** from aggregate stats (Top Artists/Wrapped) to prevent "skipping" data from polluting your profile.

### Deduplication
The ingestion engine uses a 4-hour window for Spotify polling and a `track_id` comparison for Subsonic to ensure that the same play event isn't counted multiple times across different sources.

---

## 🛠 Frontend Architecture

-   **Visualization**: Charts are rendered using `Recharts`, utilizing HSL-based dynamic color palettes for a premium "glassmorphism" look.
-   **Responsiveness**: The grid layout adapts from dynamic columns on desktop to a stacked "mobile-first" scroll view for on-the-go tracking.
-   **State Sync**: Uses a `useDashboardData` hook that implements debounced polling to keep statistics fresh without overwhelming the backend SQL engine.
