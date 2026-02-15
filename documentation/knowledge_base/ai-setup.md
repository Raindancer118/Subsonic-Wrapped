# 🤖 AI Configuration & LLM Onboarding

Subsonic Wrapped utilizes Large Language Models (LLMs) to provide qualitative analysis of your music taste. This guide helps you choose and configure the right AI provider for your instance.

---

## 🏛 Choosing a Provider

| Feature | 🪐 Google Gemini | ⚡ Groq (Llama/Mixtral) |
| :--- | :--- | :--- |
| **Philosophy** | Depth & Context | Speed & Efficiency |
| **Best For** | Multi-year analysis (Wrapped) | Real-time Genre classification |
| **Free Tier** | Robust (via AI Studio) | Limited rate-limits |
| **Privacy** | Google Terms Apply | Groq Privacy Shield |

---

## 🛠 Setup Instructions

### 1. Google Gemini (Recommended)
Excellent reasoning capabilities and a generous free tier for personal projects.

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Sign in with your Google Account.
3.  Click **Create API key in new project**.
4.  Copy the generated key (starts with `AIza...`).
5.  In Subsonic Wrapped, go to **Settings** > **AI Setup**, select `gemini`, and paste the key.

### 2. Groq
The fastest inference engine available, ideal for users who want near-instant response times.

1.  Log in to the [Groq Console](https://console.groq.com/keys).
2.  Navigate to **API Keys**.
3.  Click **Create API Key**.
4.  Copy the key (starts with `gsk_...`).
5.  In Subsonic Wrapped, go to **Settings** > **AI Setup**, select `groq`, and paste the key.

---

## ✨ Features Enabled by AI

### 🏷 Smart Genre Tagging
If your music library has missing tags, the AI looks at the artist's discography and predicts the genre. This ensures your "Genre Distribution" charts are always complete and beautifully visualized.

### 🎭 Personality Archetypes
While the system uses heuristics for basic archetypes (e.g., "The Superfan"), the AI provides a **narrative layer** to these personas, explaining *why* you fit that mold in a poetic or humorous way.

### 🍱 The "Wrapped" Roast & Vibe Check
-   **Roast**: A snarky, high-energy critique of your music taste designed to be shared with friends.
-   **Vibe Check**: A calm, atmospheric summary of your year's emotional resonance.

---

## 🛡 Security & Keys

### AES-256-GCM Encryption
To maintain the highest security standards, your AI API keys are **never** stored in plain text.

-   **Encryption**: Keys are encrypted at rest using your instance's `app.secret`.
-   **Transmission**: Keys are only decrypted in-memory during a live API request and are never logged or exposed in client-side responses.
-   **Redaction**: Any server-side errors involving the AI service automatically redact the API key from the stack trace.

### Configuration Drifts
If you change your `app.secret` in `config.yml`, all stored AI keys will become unreadable. You will need to re-save them in the **Settings** menu.
