# AI Configuration Guide

Subsonic Wrapped supports integration with **Google Gemini** and **Groq** to provide enhanced features like:
- **Genre Classification**: AI fills in missing genre data for your tracks.
- **Wrapped Roasts**: Get a witty, snarky commentary on your listening habits.
- **Vibe Checks**: A poetic summary of your musical year.
- **Enhanced Personalities**: AI-driven analysis of your music persona.

## Supported Providers

### 1. Google Gemini (Recommended)
Free tier available and excellent reasoning capabilities.

*   **Step 1**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
*   **Step 2**: Click **Create API Key**.
*   **Step 3**: Select a project (or create a new one).
*   **Step 4**: Copy the generated key.

### 2. Groq
Extremely fast inference, great for real-time interactions.

*   **Step 1**: Go to [Groq Console](https://console.groq.com/keys).
*   **Step 2**: Create an account or log in.
*   **Step 3**: Click **Create API Key**.
*   **Step 4**: Name your key (e.g., "Subsonic Wrapped") and copy it.

## Configuration

1.  Navigate to **Settings** in the Subsonic Wrapped dashboard.
2.  Scroll to the **AI Configuration** section.
3.  Select your provider (Gemini or Groq).
4.  Paste your API Key.
5.  Click **Test Connection** to verify it works.
6.  Click **Save**.

## Security Note
Your API keys are **NOT** stored in plain text. They are encrypted using **AES-256-GCM** encryption before being saved to the database. The encryption key is derived from your application's unique `APP_SECRET` (defined in `config.yml`).

> **Note**: If you lose or change your `APP_SECRET`, you will need to re-enter your API keys as they will no longer be decipherable.
