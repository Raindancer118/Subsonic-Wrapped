# ✨ The "Wrapped" Retrospective Engine

The "Wrapped" feature is the core emotional heart of Subsonic Wrapped. It transforms millions of data points into a cinematic, slide-based journey that captures the essence of a user's musical year.

## 🎞 Story Mode Overview

Accessed via the `/story` route, Wrapped uses a state-driven carousel to guide users through their history.
-   **Animations**: Leverages `framer-motion` for physics-based transitions (slides, fades, and scale-ups).
-   **Audio Integration**: Dynamically plays the user's #1 track in the background for an immersive experience.
-   **Sharability**: Final slides are optimized for "Screenshot mode" with high-contrast typography and QR code integration.

---

## 🧬 Personality Archetypes & Algorithms

Subsonic Wrapped uses a heuristic-based "Listener Archetype" engine. Every year, users are assigned a persona based on the following classification logic:

| Archetype | Condition (Heuristic) | Description |
| :--- | :--- | :--- |
| **The Superfan** | `Top Artist / Total Plays > 0.30` | You found your muse and didn't look back. |
| **The Loyalist** | `Top Artist / Total Plays > 0.20` | You have a clear favorite, but keep an open mind. |
| **The Discoverer** | `Unique Tracks / Total Plays > 0.80` | You rarely listen to the same song twice. |
| **The Explorer** | `Unique Artists / Total Tracks > 0.40` | Your library is a map of unknown territories. |
| **The Time Traveler** | `Avg(Release Year) < 2010` | You live in the golden eras of the past. |
| **The Modernist** | `Avg(Release Year) > Date.Now - 2Y` | You are always at the cutting edge of new releases. |
| **The Genre Hopper** | `Unique Genres > 6` | Your palette is vast and impossible to pin down. |
| **The Night Owl** | `Max(Audio Day) == "Night"` | Your best memories happen under the moonlight. |
| **The Music Fan** | *Fallback* | A balanced listener who enjoys everything. |

---

## 📈 Metric Calculation Logic

### 1. The 30-Second Threshold
To ensure statistics reflect *intent* rather than *automated skips*, we enforce a strict threshold:
`WHERE listened_duration_ms >= 30000`
This applies to all aggregate calculations, including Top Artists, Top Songs, and Genre Distribution.

### 2. "Listening Age"
This unique metric calculates the "vintage" of your music taste.
-   **Formula**: `(Sum of Release Year * Play Count) / Total Plays`
-   **Significance**: Helps differentiate between listeners of classic rock vs. modern hyperpop.

### 3. Audio Day Segments
We partition the 24-hour clock into four narrative buckets based on your local timezone:
-   🌅 **Morning**: 05:00 - 11:59
-   ☀️ **Afternoon**: 12:00 - 17:59
-   🌆 **Evening**: 18:00 - 23:59
-   🌙 **Night**: 00:00 - 04:59

---

## 🧠 AI-Enhanced Features

### The "Roast" and "Vibe Check"
If enabled, the Wrapped engine passes the following JSON context to the [AI Service](ai-integration.md):
-   `topArtists`, `topSongs`, `topGenres`, `totalMinutes`, `archetype`.

#### Snarky Roast
The AI is instructed to be a "pretentious music snob." It looks for contradictions in your data (e.g., listening to Death Metal in the Morning) to create a personalized, humorous critique.

#### Poetic Vibe Check
Focuses on the emotional arc of your year. It uses the "Listening Age" and "Audio Day" to describe the "flavor" of your musical journey in a soulful, appreciative tone.
