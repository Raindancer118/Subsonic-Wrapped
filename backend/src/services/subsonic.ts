import axios from 'axios';
import db from '../database';
import { decrypt } from '../utils/encryption';
import { createAuthParams } from '../utils/subsonic';
import config from '../config';
import crypto from 'crypto';

interface SubsonicAuth {
    subsonicUser?: string;
    password?: string;
}

// State map to track playback for scrobbling
const userPlayerStats = new Map<number, {
    vendorId: string;
    trackId: number;
    detectedAt: number;
    durationMs: number;
    scrobbled: boolean;
}>();

export async function pollSubsonicNowPlaying() {
    const users = db.prepare('SELECT id, username, subsonic_url, subsonic_auth FROM users WHERE subsonic_url IS NOT NULL').all() as any[];

    for (const user of users) {
        if (!user.subsonic_auth) continue;

        try {
            const authData: SubsonicAuth = JSON.parse(user.subsonic_auth);
            const password = decrypt(authData.password || '');

            if (!password) continue;

            const salt = crypto.randomBytes(6).toString('hex');
            const token = crypto.createHash('md5').update(password + salt).digest('hex');
            const baseURL = user.subsonic_url.endsWith('/') ? user.subsonic_url.slice(0, -1) : user.subsonic_url;

            const subUser = authData.subsonicUser || user.username;

            const params = createAuthParams(subUser, token, salt);

            const response = await axios.get(`${baseURL}/rest/getNowPlaying.view?${params}`);
            const nowPlaying = response.data['subsonic-response']?.nowPlaying?.entry;

            if (nowPlaying) {
                const entries = Array.isArray(nowPlaying) ? nowPlaying : [nowPlaying];
                const entry = entries.find((e: any) => e.username === subUser);

                if (entry) {
                    const trackData = {
                        vendor_id: `subsonic:track:${entry.id}`,
                        title: entry.title,
                        artist: entry.artist,
                        album: entry.album,
                        duration_ms: entry.duration ? entry.duration * 1000 : 0,
                        image_url: entry.coverArt ? `${baseURL}/rest/getCoverArt.view?id=${entry.coverArt}&${params}` : null
                    };

                    const insertTrack = db.prepare(`
                        INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url)
                        VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url)
                        ON CONFLICT(vendor_id) DO UPDATE SET 
                            image_url = excluded.image_url,
                            title = excluded.title
                        RETURNING id
                     `);

                    const trackRow = insertTrack.get(trackData) as { id: number };

                    // Stateful Scrobbling Logic
                    const currentState = userPlayerStats.get(user.id);

                    if (currentState && currentState.vendorId === trackData.vendor_id) {
                        // Continued playback
                        const timePlayed = Date.now() - currentState.detectedAt;

                        // Scrobble rule: > config threshold (20s default)
                        const thresholdMs = config.scrobble.threshold * 1000;
                        if (!currentState.scrobbled && timePlayed > thresholdMs) {
                            console.log(`Scrobbling Subsonic track: ${trackData.title} for user ${user.id}`);
                            db.prepare(`
                                INSERT OR IGNORE INTO play_history (user_id, track_id, played_at, source)
                                VALUES (?, ?, ?, 'subsonic')
                             `).run(user.id, currentState.trackId, new Date().toISOString());

                            currentState.scrobbled = true;
                            userPlayerStats.set(user.id, currentState);
                        }
                    } else {
                        // New track detected
                        userPlayerStats.set(user.id, {
                            vendorId: trackData.vendor_id,
                            trackId: trackRow.id,
                            detectedAt: Date.now(),
                            durationMs: trackData.duration_ms,
                            scrobbled: false
                        });
                    }
                } else {
                    // User not playing anything?
                    // We could clear state, but maybe they paused?
                    // If we want to be strict, we clear. If we want to allow resumption, we keep it for a bit?
                    // For now, let's keep it (or key it by timeout?). 
                    // Simple approach: if gone, we assume stopped. But "NowPlaying" is ephemeral.
                    // If they stop, we won't see it next time.
                }
            } else {
                // Determine if we should clear state?
            }
        } catch (e) {
            console.error(`Error polling Subsonic for user ${user.id}:`, e);
        }
    }
}
