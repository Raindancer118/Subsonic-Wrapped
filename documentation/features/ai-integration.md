# AI Integration

## Overview
The AI Integration feature allows Subsonic Wrapped to utilize Large Language Models (LLMs) to enhance the user experience. Currently, it supports **Google Gemini** and **Groq**.

## Features

### 1. Genre Classification Fallback
When a track is ingested via ListenBrainz or Scrobble but lacks genre information from primary sources (Spotify/MusicBrainz), the system queries the configured AI provider to determine the most likely genre.

**Logic:**
- Triggered in `enrichTrack` (Services).
- Prompt: "What is the primary music genre of the song 'Title' by 'Artist'?"
- Result: Stored in `tracks` table.

### 2. Wrapped "Roast My Taste"
Generates a humorous, snarky commentary on the user's listening habits for the requested year.

**Logic:**
- Endpoint: `POST /api/wrapped/ai-analysis`
- Context Provided: Top 5 Artists, Top 5 Genres, Total Minutes.
- Result: Stored in `settings` table (key: `wrapped_roast_YYYY`) to avoid re-generation costs.

### 3. Wrapped "Vibe Check"
Generates a poetic description of the user's musical year.

**Logic:**
- Endpoint: `POST /api/wrapped/ai-analysis`
- Context Provided: Top Artists, Time of Day (Audio Day), Listening Age.
- Result: Stored in `settings` table (key: `wrapped_vibe_YYYY`).

## Configuration
AI settings are stored in the database (or `config.yml` override).
- **Provider**: `gemini` | `groq`
- **API Key**: String (AES-256 Encrypted in DB)

## Security
- **Encryption**: API Keys are encrypted at rest using `AES-256-GCM` with a unique IV.
- **Keys**: Derived from `config.app.secret`.
- **Logging**: API Keys are redacted/never logged.

## Technical Details
- **Service**: `backend/src/services/ai.ts`
- **Dependencies**: `@google/generative-ai`, `groq-sdk`
