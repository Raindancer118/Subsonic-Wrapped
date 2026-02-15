# Wrapped (Story Mode)

## Overview
The **Wrapped** feature provides users with a comprehensive "Year in Review" style retrospective of their listening habits. It is designed to be an immersive, "story" based experience similar to Spotify Wrapped, available at any time.

## Key Metrics
The feature aggregates data from `play_history` and `tracks` to calculate:

1.  **Total Listening Time**: Sum of milliseconds played.
    *   **Filter**: Only counts plays where `listened_duration_ms >= 30,000` (30 seconds).
2.  **Top Artist**: The artist with the most plays (meeting the 30s criteria).
3.  **Top Songs**: The 5 most played tracks.
4.  **Top Genres**: The 5 most played genres.
5.  **Audio Day**: A breakdown of listening habits by time of day:
    *   **Morning**: 05:00 - 11:59
    *   **Afternoon**: 12:00 - 17:59
    *   **Evening**: 18:00 - 23:59
    *   **Night**: 00:00 - 04:59
6.  **Listening Age**: The weighted average release year of all played tracks.
    *   Formula: `Sum(Year * PlayCount) / TotalPlays`

## Personality Archetypes
Based on the metrics, users are assigned one of the following archetypes:

*   **The Superfan**: Top artist accounts for >30% of total plays.
*   **The Loyalist**: Top artist accounts for >20% of total plays.
*   **The Discoverer**: >80% of tracks played are unique (rarely repeats songs).
*   **The Explorer**: High diversity of artists (>40% unique artists).
*   **The Time Traveler**: Average listening age is before 2010.
*   **The Modernist**: Average listening age is within the last 2 years.
*   **The Night Owl**: Most listening activity occurs at Night.
*   **The Early Bird**: Most listening activity occurs in the Morning.
*   **The 9-to-5er**: Most listening activity occurs in the Afternoon.
*   **The Genre Hopper**: Listens to >5 major genres.
*   **The Music Fan**: Default fallback if no specific traits are dominant.

## Technical Implementation
### Backend
*   **Endpoint**: `GET /api/wrapped`
*   **Parameters**: `year` (optional), `range` ('all' or 'year').
*   **Database**: Uses optimized SQL queries with strict `WHERE listened_duration_ms >= 30000` clauses.

### Frontend
*   **Route**: `/story`
*   **Libraries**: `framer-motion` for slide transitions.
*   **Components**: `Wrapped.tsx` handles the carousel logic and rendering of individual slides.

## Compliance
*   **30s Rule**: strictly enforced to prevent skips from skewing data.
*   **Privacy**: Data is only aggregated for the authenticated user.
