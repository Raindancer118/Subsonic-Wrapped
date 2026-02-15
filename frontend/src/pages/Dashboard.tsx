import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LogOut, Music, Clock, BarChart2 } from 'lucide-react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [current, setCurrent] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [extended, setExtended] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [playerRes, statsRes, recentRes, extendedRes] = await Promise.all([
                client.get('/player/current'),
                client.get('/stats/summary'),
                client.get('/stats/recent'),
                client.get('/stats/extended')
            ]);
            setCurrent(playerRes.data);
            setStats(statsRes.data);
            setRecent(recentRes.data.history);
            setExtended(extendedRes.data);
        } catch (e) {
            console.error('Failed to fetch dashboard data', e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

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
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                    <LogOut size={18} /> Logout
                </button>
            </header>

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
                                <p className="text-xl text-gray-300 mb-2">{current.track.artist}</p>
                                <p className="text-sm text-gray-400">{current.track.album}</p>
                                {current.track.bitrate && (
                                    <div className="mt-2 inline-block px-2 py-1 bg-gray-700 rounded text-xs font-mono text-gray-300">
                                        {current.track.codec} / {current.track.bitrate}kbps
                                    </div>
                                )}
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
                        <Clock size={18} /> Listening Time
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400 text-sm">Today</p>
                            <p className="text-2xl font-bold text-green-400">{stats ? formatMs(stats.today_time_ms) : '0m'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">All Time</p>
                            <p className="text-2xl font-bold">{stats ? formatMs(stats.total_time_ms) : '0m'}</p>
                        </div>
                    </div>
                </div>

                {/* Quality Stats */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart2 size={18} /> Audio Quality
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400 text-sm">Avg Bitrate</p>
                            <p className="text-2xl font-bold text-blue-400">{extended?.quality?.avg_bitrate ? Math.round(extended.quality.avg_bitrate) : 0} kbps</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Max Bitrate</p>
                            <p className="text-xl font-bold text-gray-300">{extended?.quality?.max_bitrate || 0} kbps</p>
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
                        <div className="h-64 flex items-end gap-1">
                            {Array.from({ length: 24 }).map((_, hour) => {
                                const data = extended.hourly.find((h: any) => parseInt(h.hour) === hour);
                                const count = data ? data.count : 0;
                                const max = Math.max(...extended.hourly.map((h: any) => h.count), 1);
                                const height = (count / max) * 100;
                                return (
                                    <div key={hour} className="flex-1 flex flex-col items-center group relative">
                                        <div
                                            className="w-full bg-green-500/50 hover:bg-green-500 transition-all rounded-t-sm"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                        <span className="text-[10px] text-gray-500 mt-1">{hour}</span>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-xs p-1 rounded whitespace-nowrap z-50">
                                            {count} plays at {hour}:00
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Weekly Activity */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
                        <div className="space-y-2">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                                const data = extended.weekly.find((w: any) => parseInt(w.day) === index);
                                const count = data ? data.count : 0;
                                const max = Math.max(...extended.weekly.map((w: any) => w.count), 1);
                                const percent = (count / max) * 100;

                                return (
                                    <div key={day} className="flex items-center gap-2">
                                        <span className="w-20 text-xs text-gray-400">{day}</span>
                                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${percent}%` }}></div>
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
                            {extended.genres.slice(0, 5).map((genre: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm truncate max-w-[150px]">{genre.genre || 'Unknown'}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500"
                                                style={{ width: `${(genre.count / extended.genres[0].count) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono w-6 text-right">{genre.count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Platform Split */}
                    <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center justify-center">
                        <h3 className="text-lg font-semibold mb-4 w-full text-left">Platform Split</h3>
                        <div className="flex gap-4">
                            {extended.platforms.map((p: any) => (
                                <div key={p.source} className="text-center">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${p.source === 'spotify' ? 'border-green-500' : 'border-orange-500'}`}>
                                        <span className="text-xl font-bold">{p.count}</span>
                                    </div>
                                    <p className="mt-2 capitalize text-gray-400">{p.source}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Years Distribution (Simple List for now) */}
                    <div className="bg-gray-800 rounded-xl p-6 overflow-hidden">
                        <h3 className="text-lg font-semibold mb-4">Music Era</h3>
                        <div className="flex items-end gap-[2px] h-32">
                            {extended.years.map((y: any) => {
                                // Simple normalization 
                                const max = Math.max(...extended.years.map((y: any) => y.count), 1);
                                const height = (y.count / max) * 100;
                                return (
                                    <div key={y.year} className="flex-1 bg-yellow-500/50 hover:bg-yellow-500 transition-colors rounded-t-sm relative group" style={{ height: `${height}%` }}>
                                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-xs p-1 z-50 rounded whitespace-nowrap">
                                            {y.year}: {y.count}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{extended.years[0]?.year}</span>
                            <span>{extended.years[extended.years.length - 1]?.year}</span>
                        </div>
                    </div>

                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent History */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Recently Played</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {recent.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded transition-colors group">
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

                {/* Top Artists */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Artists</h3>
                    <div className="space-y-4">
                        {stats?.top_artists?.map((artist: any, i: number) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className={`text-xl font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 bg-gray-700 h-10 rounded-lg relative overflow-hidden group">
                                    <div
                                        className="h-full bg-green-600/20 group-hover:bg-green-600/30 transition-colors flex items-center px-4"
                                        style={{ width: '100%' }} // TODO: Relative width based on max plays
                                    >
                                        <span className="font-medium relative z-10">{artist.artist}</span>
                                    </div>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">
                                        {artist.play_count} plays
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
