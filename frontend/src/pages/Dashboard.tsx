import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LogOut, Music, Clock, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import TimeRangeSelector from '../components/TimeRangeSelector';
import TopTracksList from '../components/TopTracksList';
import TopAlbumsList from '../components/TopAlbumsList';
import DetailModal from '../components/DetailModal';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [current, setCurrent] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [recent, setRecent] = useState<any[]>([]);
    const [extended, setExtended] = useState<any>(null);
    const [topTracks, setTopTracks] = useState<any[]>([]);
    const [topAlbums, setTopAlbums] = useState<any[]>([]);
    const [range, setRange] = useState<'today' | '7d' | '30d' | 'year' | 'all'>('7d'); // Default to 7 days for interesting data

    const [selectedDetail, setSelectedDetail] = useState<{ type: 'track' | 'artist' | 'album', data: any } | null>(null);

    const fetchData = async () => {
        try {
            // Player is independent of range
            const playerRes = await client.get('/player/current');
            setCurrent(playerRes.data);

            const [statsRes, recentRes, extendedRes, tracksRes, albumsRes] = await Promise.all([
                client.get(`/stats/summary?range=${range}`),
                client.get(`/stats/recent`), // Recent is always recent history, maybe independent? Or filtered? Let's leave as is.
                client.get(`/stats/extended?range=${range}`),
                client.get(`/stats/top/tracks?range=${range}`),
                client.get(`/stats/top/albums?range=${range}`)
            ]);

            setStats(statsRes.data);
            setRecent(recentRes.data.history);
            setExtended(extendedRes.data);
            setTopTracks(tracksRes.data);
            setTopAlbums(albumsRes.data);
        } catch (e) {
            console.error('Failed to fetch dashboard data', e);
        }
    };

    const handleTrackClick = async (id: number) => {
        try {
            const res = await client.get(`/stats/track/${id}`);
            setSelectedDetail({ type: 'track', data: res.data });
        } catch (e) {
            console.error(e);
        }
    };

    const handleArtistClick = async (name: string) => {
        try {
            const res = await client.get(`/stats/artist/${encodeURIComponent(name)}`);
            setSelectedDetail({ type: 'artist', data: res.data });
        } catch (e) {
            console.error(e);
        }
    };

    const handleAlbumClick = async (album: string, artist: string) => {
        try {
            const res = await client.get(`/stats/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`);
            setSelectedDetail({ type: 'album', data: res.data });
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, [range]); // Re-fetch when range changes

    const formatMs = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m ${seconds % 60}s`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-green-600 p-2 rounded-lg">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Your Stats</h1>
                        <p className="text-gray-400 text-sm">Welcome back, {user?.username}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/settings"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                    >
                        <SettingsIcon size={18} /> Settings
                    </Link>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            {/* Time Range Selector */}
            <div className="flex justify-center mb-8">
                <TimeRangeSelector activeRange={range} onChange={setRange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Current Playback */}
                <div className="col-span-1 md:col-span-2 bg-gray-800 rounded-xl p-6 relative overflow-hidden">
                    {current?.track?.is_playing ? (
                        <div className="flex gap-6 items-center z-10 relative">
                            {current.track.image_url ? (
                                <img src={current.track.image_url} alt="Album Art" className="w-32 h-32 rounded-lg shadow-lg" />
                            ) : (
                                <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                                    <Music size={40} className="text-gray-500" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 text-green-400 text-sm font-bold uppercase tracking-wider mb-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Now Playing on {current.source}
                                </div>
                                <h2 className="text-3xl font-bold mb-1 line-clamp-1">{current.track.title}</h2>
                                <p
                                    className="text-xl text-gray-300 mb-2 cursor-pointer hover:text-white hover:underline"
                                    onClick={() => handleArtistClick(current.track.artist)}
                                >
                                    {current.track.artist}
                                </p>
                                <p
                                    className="text-sm text-gray-400 cursor-pointer hover:text-white hover:underline"
                                    onClick={() => handleAlbumClick(current.track.album, current.track.artist)}
                                >
                                    {current.track.album}
                                </p>
                                {/* Bitrate removed as per request */}
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-500">
                            <Music size={32} className="mr-3" /> No music playing right now
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock size={18} /> Listening Time ({range})
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400 text-sm">Selected Period</p>
                            <p className="text-2xl font-bold text-green-400">{stats ? formatMs(stats.total_time_ms) : '0m'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Today</p>
                            <p className="text-xl font-bold">{stats ? formatMs(stats.today_time_ms) : '0m'}</p>
                        </div>
                    </div>
                </div>
            </div>


            {/* EXTENDED VISUALIZATIONS */}
            {extended && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Hourly Activity */}
                    <div className="bg-gray-800 rounded-xl p-6 col-span-2">
                        <h3 className="text-lg font-semibold mb-4">Hourly Activity</h3>
                        {extended.hourly.length > 0 ? (
                            <div className="h-64 flex items-end gap-1">
                                {Array.from({ length: 24 }).map((_, hour) => {
                                    const data = extended.hourly.find((h: any) => parseInt(h.hour) === hour);
                                    const count = data ? data.count : 0;
                                    const max = Math.max(...extended.hourly.map((h: any) => h.count), 1);
                                    const height = max > 0 ? (count / max) * 100 : 0;
                                    return (
                                        <div key={hour} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                                            <div
                                                className="w-full bg-green-500/50 hover:bg-green-500 transition-all rounded-t-sm"
                                                style={{ height: `${height}%` }}
                                            ></div>
                                            <span className="text-[10px] text-gray-500 mt-1">{hour}</span>
                                            {count > 0 && (
                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-xs p-1 rounded whitespace-nowrap z-50">
                                                    {count} plays
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-500">
                                No activity data for this period.
                            </div>
                        )}
                    </div>

                    {/* Weekly Activity */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
                        <div className="space-y-2">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                                const data = extended.weekly.find((w: any) => parseInt(w.day) === index);
                                const count = data ? data.count : 0;
                                const max = Math.max(...extended.weekly.map((w: any) => w.count), 1);
                                const percent = max > 0 ? (count / max) * 100 : 0;

                                return (
                                    <div key={day} className="flex items-center gap-2">
                                        <span className="w-20 text-xs text-gray-400">{day}</span>
                                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                        </div>
                                        <span className="text-xs font-mono w-8 text-right">{count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Top Genres */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Genres</h3>
                        <div className="space-y-3">
                            {extended.genres.length > 0 ? extended.genres.slice(0, 5).map((genre: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm truncate max-w-[150px]">{genre.genre || 'Unknown'}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all duration-500"
                                                style={{ width: `${(genre.count / extended.genres[0].count) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono w-6 text-right">{genre.count}</span>
                                    </div>
                                </div>
                            )) : <div className="text-gray-500 text-sm">No genre data for filters.</div>}
                        </div>
                    </div>

                    {/* Platform Split */}
                    <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center justify-center">
                        <h3 className="text-lg font-semibold mb-4 w-full text-left">Platform Split</h3>
                        <div className="flex gap-4">
                            {extended.platforms.length > 0 ? extended.platforms.map((p: any) => (
                                <div key={p.source} className="text-center">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${p.source === 'spotify' ? 'border-green-500' : 'border-orange-500'}`}>
                                        <span className="text-xl font-bold">{p.count}</span>
                                    </div>
                                    <p className="mt-2 capitalize text-gray-400">{p.source}</p>
                                </div>
                            )) : <div className="text-gray-500 text-sm">No data.</div>}
                        </div>
                    </div>

                    {/* Years Distribution (Simple List for now) */}
                    <div className="bg-gray-800 rounded-xl p-6 overflow-hidden">
                        <h3 className="text-lg font-semibold mb-4">Music Era</h3>
                        <div className="flex items-end gap-[2px] h-32">
                            {extended.years.length > 0 ? extended.years.map((y: any) => {
                                const max = Math.max(...extended.years.map((y: any) => y.count), 1);
                                const height = (y.count / max) * 100;
                                return (
                                    <div key={y.year} className="flex-1 bg-yellow-500/50 hover:bg-yellow-500 transition-colors rounded-t-sm relative group" style={{ height: `${height}%` }}>
                                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-xs p-1 z-50 rounded whitespace-nowrap">
                                            {y.year}: {y.count}
                                        </div>
                                    </div>
                                )
                            }) : <div className="w-full text-center text-gray-500 text-sm mt-10">No year data.</div>}
                        </div>
                        {extended.years.length > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>{extended.years[0]?.year}</span>
                                <span>{extended.years[extended.years.length - 1]?.year}</span>
                            </div>
                        )}
                    </div>

                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Top Tracks */}
                <TopTracksList tracks={topTracks} onTrackClick={handleTrackClick} />

                {/* Top Albums */}
                <TopAlbumsList albums={topAlbums} onAlbumClick={handleAlbumClick} />

                {/* Recent History (Always shown, maybe filtered in future, but conventionally filtered history is strictly history) */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Recently Played</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {recent.map((item: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded transition-colors group cursor-pointer"
                                onClick={() => handleTrackClick(item.id)}
                            >
                                {item.image_url ? (
                                    <img src={item.image_url} className="w-10 h-10 rounded shadow" />
                                ) : (
                                    <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-500">
                                        <Music size={16} />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate group-hover:text-white text-gray-200">{item.title}</p>
                                    <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                    <p>{new Date(item.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="capitalize text-gray-600">{item.source}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <DetailModal
                type={selectedDetail?.type || null}
                data={selectedDetail?.data}
                onClose={() => setSelectedDetail(null)}
            />
        </div>
    );
};

export default Dashboard;
