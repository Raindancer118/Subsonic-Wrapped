import express from 'express';
import axios from 'axios';
import db from '../database';
import config from '../config';
import { decrypt } from '../utils/encryption';
import { createAuthParams } from '../utils/subsonic';
import crypto from 'crypto';

import { getListenBrainzNowPlaying } from './listenbrainz';

const router = express.Router();

// Current Playback Endpoint
router.get('/current', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = (req.user as any).id;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    let currentTrack: any = null;
    let source = null;

    // 1. Check Spotify
    if (user.spotify_access_token) {
        try {
            const accessToken = decrypt(user.spotify_access_token);
            const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 3000
            });

            if (response.data && response.data.item) {
                const item = response.data.item;
                currentTrack = {
                    title: item.name,
                    artist: item.artists.map((a: any) => a.name).join(', '),
                    album: item.album.name,
                    image_url: item.album.images[0]?.url,
                    duration_ms: item.duration_ms,
                    progress_ms: response.data.progress_ms,
                    is_playing: response.data.is_playing
                };
                source = 'spotify';
            }
        } catch (e) {
            console.error('Spotify current playing error:', e);
        }
    }

    // 2. Check ListenBrainz / Navidrome Push
    // This is instant and doesn't require polling Subsonic, so precise "Now Playing" works well here.
    if (!currentTrack || !currentTrack.is_playing) {
        const lbNowPlaying = getListenBrainzNowPlaying(userId);
        if (lbNowPlaying) {
            // Check staleness (if updated > 10m ago, ignore?)
            const diff = Date.now() - lbNowPlaying.timestamp;
            if (diff < 1000 * 60 * 10) { // 10 minutes

                // Try to find rich metadata from DB if we have seen this track before
                const dbTrack = db.prepare('SELECT image_url, year, genre, bitrate, codec FROM tracks WHERE title = ? AND artist = ?').get(lbNowPlaying.title, lbNowPlaying.artist) as any;

                currentTrack = {
                    title: lbNowPlaying.title,
                    artist: lbNowPlaying.artist,
                    album: lbNowPlaying.album,
                    image_url: dbTrack?.image_url || null,
                    duration_ms: lbNowPlaying.duration_ms,
                    bitrate: lbNowPlaying.bitrate || dbTrack?.bitrate,
                    codec: lbNowPlaying.codec || dbTrack?.codec,
                    year: dbTrack?.year,
                    genre: dbTrack?.genre,
                    progress_ms: 0,
                    is_playing: true
                };
                source = 'listenbrainz';
            }
        }
    }

    // 3. Check Subsonic Polling (as fallback)
    if ((!currentTrack || !currentTrack.is_playing) && user.subsonic_auth && user.subsonic_url) {
        try {
            const authData = JSON.parse(user.subsonic_auth);
            const password = decrypt(authData.password || '');
            if (password) {
                const salt = crypto.randomBytes(6).toString('hex');
                const token = crypto.createHash('md5').update(password + salt).digest('hex');
                const subUser = authData.subsonicUser || user.username;

                const params = createAuthParams(subUser, token, salt);
                const baseURL = user.subsonic_url.endsWith('/') ? user.subsonic_url.slice(0, -1) : user.subsonic_url;

                const response = await axios.get(`${baseURL}/rest/getNowPlaying.view?${params}`, { timeout: 3000 });
                const nowPlaying = response.data['subsonic-response']?.nowPlaying?.entry;

                if (nowPlaying) {
                    const entries = Array.isArray(nowPlaying) ? nowPlaying : [nowPlaying];
                    // Filter for our user
                    const entry = entries.find((e: any) => e.username === subUser);

                    if (entry) {
                        // Subsonic doesn't always send "is_playing", but if it's in NowPlaying, it's usually playing or paused recently.
                        // We assume playing if minutes ago < X?
                        // "minutesAgo" field exists.
                        const minutesAgo = entry.minutesAgo || 0;
                        if (minutesAgo < 20) { // arbitrary threshold
                            currentTrack = {
                                title: entry.title,
                                artist: entry.artist,
                                album: entry.album,
                                image_url: entry.coverArt ? `${baseURL}/rest/getCoverArt.view?id=${entry.coverArt}&${params}` : null,
                                duration_ms: entry.duration ? entry.duration * 1000 : 0,
                                progress_ms: 0, // Subsonic doesn't usually expose progress in getNowPlaying easily
                                is_playing: true
                            };
                            source = 'subsonic';
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Subsonic current playing error:', e);
        }
    }

    res.json({
        source,
        track: currentTrack
    });
});

export default router;
