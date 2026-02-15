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
    playHistoryId: number;
    lastUpdateAt: number;
}>();

export async function pollSubsonicNowPlaying() {
    const users = db.prepare('SELECT id, username, subsonic_url, subsonic_auth FROM users WHERE subsonic_url IS NOT NULL').all() as any[];
    const now = Date.now();

    for (const user of users) {
        if (!user.subsonic_auth) continue;

        try {
            const authData: SubsonicAuth = JSON.parse(user.subsonic_auth);

            // 1. Check Config: Use Scrobble Only?
            const serverConfig = config.subsonic ? Object.values(config.subsonic).find(s => s.url === user.subsonic_url || user.subsonic_url.includes(s.url)) : null;
            // Simplified check: If ANY defined server has useScrobbleOnly, or if we can match it. 
            // Since we store URL in DB, we try to match with config. 
            // Actually, simpler: check if the global config has a default or if we can match the domain.
            // For now, let's just check if *any* subsonic config entry has it true, or if we should add it to the DB user record?
            // The user asked for "In the config", so we check `config.subsonic`.
            // Let's iterate config.subsonic and see if the user's URL matches one that has the flag.

            let useScrobbleOnly = false;
            if (config.subsonic) {
                for (const key in config.subsonic) {
                    if (user.subsonic_url.includes(config.subsonic![key].url)) {
                        if (config.subsonic![key].useScrobbleOnly) {
                            useScrobbleOnly = true;
                        }
                        break;
                    }
                }
            }

            if (useScrobbleOnly) {
                // Skip polling for this user, they will push data via Scrobble Endpoint
                continue;
            }

            const password = decrypt(authData.password || '');

            if (!password) continue;

            const salt = crypto.randomBytes(6).toString('hex');
            const token = crypto.createHash('md5').update(password + salt).digest('hex');
            const baseURL = user.subsonic_url.endsWith('/') ? user.subsonic_url.slice(0, -1) : user.subsonic_url;

            const subUser = authData.subsonicUser || user.username;

            const params = createAuthParams(subUser, token, salt);

            // Timeout added to prevent accumulation of hangs
            const response = await axios.get(`${baseURL}/rest/getNowPlaying.view?${params}`, { timeout: 10000 });
            const nowPlaying = response.data['subsonic-response']?.nowPlaying?.entry;

            if (nowPlaying) {
                const entries = Array.isArray(nowPlaying) ? nowPlaying : [nowPlaying];
                const entry = entries.find((e: any) => e.username === subUser);

                // Bug Fix: Check if track is stale (minutesAgo > 0)
                // If the track was started > 5 minutes ago and length is < 5 mins, it's finished? 
                // Subsonic `minutesAgo` is "Minutes since the player started playing this song".
                // If `minutesAgo` keeps increasing, it might just mean they are playing a long song.
                // BUT if `minutesAgo` hasn't changed between polls? No, it would increase.
                // If the song is paused, `minutesAgo` usually *continues to increase* because it's time since start.
                // WE NEED TO CHECK PROGRESS.
                // Does entry have `seconds`? (Time elapsed).
                // If `entry.minutesAgo` is large, we should be careful.
                // BETTER FIX: Check `entry.minutesAgo`. If it is significantly larger than the track duration, it's definitely stale.
                // Also, if `minutesAgo` is unchanging? No, it's integer minutes.
                // Let's assume if `minutesAgo` > `duration` + buffer, it's stale.

                let isStale = false;
                if (entry) {
                    const durationMin = (entry.duration || 0) / 60;
                    if (entry.minutesAgo > (durationMin + 5)) {
                        isStale = true;
                    }
                }

                if (entry && !isStale) {
                    // Extract Metadata
                    const trackData = {
                        vendor_id: `subsonic:track:${entry.id}`,
                        title: entry.title,
                        artist: entry.artist,
                        album: entry.album,
                        duration_ms: entry.duration ? entry.duration * 1000 : 0,
                        image_url: entry.coverArt ? `${baseURL}/rest/getCoverArt.view?id=${entry.coverArt}&${params}` : null,
                        year: entry.year || null,
                        genre: entry.genre || null,
                        bitrate: entry.bitrate || null,
                        codec: entry.contentType || entry.suffix || null,
                        track_number: entry.track || null,
                        disc_number: entry.discNumber || null,
                        raw_data: JSON.stringify(entry)
                    };

                    const insertTrack = db.prepare(`
                        INSERT INTO tracks (vendor_id, title, artist, album, duration_ms, image_url, year, genre, bitrate, codec, track_number, disc_number, raw_data)
                        VALUES (@vendor_id, @title, @artist, @album, @duration_ms, @image_url, @year, @genre, @bitrate, @codec, @track_number, @disc_number, @raw_data)
                        ON CONFLICT(vendor_id) DO UPDATE SET 
                            image_url = excluded.image_url,
                            title = excluded.title,
                            album = excluded.album,
                            artist = excluded.artist,
                            year = excluded.year,
                            genre = excluded.genre,
                            bitrate = excluded.bitrate,
                            codec = excluded.codec,
                            raw_data = excluded.raw_data
                        RETURNING id
                     `);

                    const trackRow = insertTrack.get(trackData) as { id: number };

                    // Stateful Logic
                    let currentState = userPlayerStats.get(user.id);

                    // Detect new track
                    if (!currentState || currentState.vendorId !== trackData.vendor_id) {
                        // Start new tracking session

                        // Insert play_history immediately with 0 duration
                        const insertPlay = db.prepare(`
                            INSERT INTO play_history (user_id, track_id, played_at, source, listened_duration_ms)
                            VALUES (?, ?, ?, 'subsonic', 0)
                            RETURNING id, played_at
                        `).get(user.id, trackRow.id, new Date().toISOString()) as { id: number, played_at: string };

                        currentState = {
                            vendorId: trackData.vendor_id,
                            trackId: trackRow.id,
                            detectedAt: now,
                            // Use lastPollTime to track precise deltas?
                            // For simplicity, we assume we poll every X seconds. 
                            // Better: Store timestamp of last update.
                            lastUpdateAt: now,
                            playHistoryId: insertPlay.id,
                            durationMs: trackData.duration_ms,
                            scrobbled: false
                        };
                        userPlayerStats.set(user.id, currentState as any); // Update type if needed, or cast

                    } else {
                        // Continued playback
                        // Calculate delta since last update
                        // We use the simpler approach: add the polling interval? 
                        // Or better: diff from lastUpdateAt
                        const lastUpdate = (currentState as any).lastUpdateAt || currentState.detectedAt;
                        const delta = now - lastUpdate;

                        // Cap delta to reasonable amount (e.g. if we missed a poll, don't add 5 hours. Max 2x poll interval)
                        const maxDelta = (config.polling.subsonic * 1000) * 2.5;
                        const actualDelta = Math.min(delta, maxDelta);

                        if (actualDelta > 0) {
                            db.prepare(`
                                UPDATE play_history 
                                SET listened_duration_ms = listened_duration_ms + ? 
                                WHERE id = ?
                            `).run(actualDelta, (currentState as any).playHistoryId);
                        }

                        // Update state
                        (currentState as any).lastUpdateAt = now;
                        userPlayerStats.set(user.id, currentState);

                        // Legacy "Scrobbled" boolean check (optional, but good for logs)
                        // Verify total listened time from DB?
                        // Or just use our running total?
                        // We'll trust the DB update.
                    }
                } else {
                    // User not found in NowPlaying -> Stopped
                    userPlayerStats.delete(user.id);
                }
            } else {
                // No entries -> Stopped
                userPlayerStats.delete(user.id);
            }
        } catch (e) {
            console.error(`Error polling Subsonic for user ${user.id}:`, e);
        }
    }
}
