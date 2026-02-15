# 🧠 AI Integration & LLM Services

Subsonic Wrapped leverages modern Large Language Models (LLMs) to transform raw listening data into a rich, narrative experience. By integrating with high-performance inference engines, we provide insights that go beyond simple charts.

## 🤖 Supported Providers

The application core logic is provider-agnostic, currently offering first-class support for:

### 1. Google Gemini
-   **Model**: Optimized for `gemini-1.5-flash`.
-   **Capabilities**: High context window, excellent for long-term historical analysis.
-   **Setup**: Requires a free/tier API key from [Google AI Studio](https://aistudio.google.com/).

### 2. Groq (Llama 3 / Mixtral)
-   **Model**: Defaults to `llama3-8b-8192` or `mixtral-8x7b-32768`.
-   **Capabilities**: Extreme inference speed, perfect for real-time vibe checks.
-   **Setup**: Requires an API key from [Groq Console](https://console.groq.com/).

---

## 🚀 AI-Driven Features

### 1. Metadata Enrichment (Genre Fallback)
When a track is ingested but lacks genre data from Spotify or the source file, the **AI Service** is invoked as a high-confidence fallback.
-   **Logic**: `Services.enrichTrack` triggers a prompt: *"What is the primary music genre of the song '${title}' by '${artist}'? Return ONLY the genre name."*
-   **Benefit**: Ensures that "Genre Distribution" charts are never empty, even for obscure or local tracks.

### 2. The "Wrapped" Roast
A fan-favorite feature that provides a cynical, humorous take on your music taste.
-   **Injected Context**: Top 5 Artists, Top 5 Genres, Total Minutes, and Listening Age.
-   **Prompt Tuning**: We use a specialized system prompt that instructs the AI to be "a snarky music critic who holds nothing back."
-   **Persistence**: Results are cached in the `settings` table as `wrapped_roast_YYYY` to avoid redundant API costs.

### 3. Poetic "Vibe Check"
Conversely, the "Vibe Check" provides a deep, atmospheric description of your year's musical journey.
-   **Injected Context**: Audio Day patterns (e.g., "Night Owl" tendencies) and top lyrical themes detected via artist names.
-   **Prompt Tuning**: Instructs the AI to be "evocative, soulful, and appreciative of the user's unique journey."

---

## 🛡 Security & Reliability

### API Key Protection (AES-256-GCM)
We treat AI API keys as high-value secrets.
-   **Encryption**: Keys are encrypted before being stored in the database using the internal `app.secret`.
-   **Rotation**: If you change your `app.secret` in `config.yml`, all stored keys will be invalidated to prevent plaintext exposure during configuration drifts.

### Cost Control & Debouncing
-   **Caching**: Every AI response for "Wrapped" is stored permanently. It will only be re-generated if requested by the user.
-   **Error Handling**: If an AI request fails (rate limit, invalid key), the system gracefully degrades. Charts will simply show "Unknown" or the AI section will be omitted from the UI without crashing the application.

### Multi-Model Fallback
The `AIService.ts` is designed for future expansion, allowing for per-user model selection and custom system instructions.
