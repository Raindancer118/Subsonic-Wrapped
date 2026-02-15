# 📡 Connecting Subsonic & Navidrome

Subsonic Wrapped is compatible with any server implementing the **Subsonic API (v1.13.0+)**. This includes Navidrome, Jellyfin, Gonic, Airsonic-Refix, and more.

---

## 🔌 Connection Methods

The application supports two primary ways to ingest data from your music server:

### A. Webhook / ListenBrainz (Recommended)
This method is **real-time** and highly efficient. Use this if your server supports the ListenBrainz scrobbling protocol (like Navidrome).
-   **Setup**: Follow the [Multi-Scrobbler Guide](../SETUP.md#advanced-ingestion-multi-scrobbler).
-   **Benefit**: Instant dashboard updates and zero polling overhead on your music server.

### B. API Polling (Legacy/Standard)
Use this if your server doesn't support webhooks or if you want Subsonic Wrapped to actively monitor your playback.
-   **Setup**: Configuring server details in the **Connections** tab.
-   **Operation**: Subsonic Wrapped tracks your playback by asking the server "What are you playing right now?" every 2 minutes.

---

## 🛠 Step-by-Step Configuration

1.  Log in to your Subsonic Wrapped dashboard.
2.  Navigate to **Settings** > **Connections**.
3.  In the "Subsonic Servers" section, click **Add Server**.
4.  **Server Name**: A friendly label for the UI (e.g., "Home Navidrome").
5.  **Server URL**: The full address of your server, including port.
    -   *Example*: `https://music.yourdomain.com:4443`
6.  **Authentication Mode**:
    -   **Token (Recommended)**: Use your standard password. Subsonic Wrapped will automatically hash it using the `salt` + `token` method.
    -   **Legacy (User/Pass)**: Only for extremely old servers that don't support token auth.
7.  **Scrobble Only**: Enable this if you are using method **A** (Webhooks). It will disable the internal polling engine to save resources.

---

## 📝 Server-Specific Notes

### Navidrome
-   **Authentication**: Supports token auth perfectly.
-   **Integration**: Highly recommended to enable ListenBrainz scrobbling in Navidrome point it to the Subsonic Wrapped webhook.

### Jellyfin
-   **Compatibility**: Use the [Jellyfin Subsonic Plugin](https://jellyfin.org/docs/general/server/plugins/subsonic/).
-   **URL**: Use the `http://IP:8096/jellyfin/` path if you have a base URL set.

### Gonic
-   **Compatibility**: Native support for the standard Subsonic API. Works well with both polling and scrobbling.

---

## ❓ FAQ

### Do I need a separate user?
It is a security best practice to create a dedicated user in your Subsonic server for "Wrapped" with **Read-Only** permissions, if your server supports it.

### My password changed!
Simply go back to **Settings** > **Connections**, edit the server, and update your credentials. They will be re-encrypted and saved.
