# 🎵 Connecting Spotify: A Step-by-Step Guide

To enable automated synchronization of your Spotify listening history, you must configure a bridge between Subsonic Wrapped and the Spotify Web API.

---

## 🛠 Step 1: Create a Spotify Developer App

Subsonic Wrapped requires its own "App" identity on the Spotify platform to request data on your behalf.

1.  Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2.  Click **Create app**.
3.  **App name**: `Subsonic Wrapped` (or any name you prefer).
4.  **App description**: `Self-hosted music analytics.`
5.  **Redirect URI**: **This is the most critical step.** It must be the public URL of your instance followed by `/api/auth/spotify/callback`.
    -   *Example*: `https://wrapped.yourdomain.com/api/auth/spotify/callback`
    -   *Local for testing*: `http://localhost:3000/api/auth/spotify/callback`
6.  Check the "Web API" checkbox and accept the terms.
7.  Click **Save**.

---

## 🔑 Step 2: Obtain Credentials

1.  Once the app is created, go to the **Settings** tab within your new Spotify app.
2.  Locate the **Client ID** and click **View client secret**.
3.  Copy both values and paste them into your `config.yml`:

```yaml
spotify:
  clientId: "YOUR_CLIENT_ID"
  clientSecret: "YOUR_CLIENT_SECRET"
  redirectUri: "YOUR_EXACT_REDIRECT_URI"
```

---

## 🔗 Step 3: Link Your Account

1.  Restart your Subsonic Wrapped instance (`./launch.sh`).
2.  Log in to your Subsonic Wrapped dashboard.
3.  Navigate to **Settings** > **Connections**.
4.  Click the vibrant **Connect with Spotify** button.
5.  You will be redirected to Spotify. Log in (if prompted) and click **Agree**.
6.  Upon successful redirection, the system will begin a "Backfill" process, pulling your 50 most recently played tracks immediately.

---

## ❓ Troubleshooting & FAQs

### "Illegal Redirect URI" Error
This happens if the `redirectUri` in your `config.yml` does **not exactly match** the one in the Spotify Developer Dashboard. Ensure there are no trailing slashes or capitalization differences.

### Gaps in History
The Spotify API only provides the last 50 tracks. Subsonic Wrapped polls every 5 minutes by default. If you listen to more than 50 tracks in a 5-minute window (unlikely) or listen while the server is offline, those tracks cannot be recovered.

### Token Expiration
Subsonic Wrapped manages token refreshing automatically using the `spotify_refresh_token` stored in the encrypted database. You should only need to authorize once.
