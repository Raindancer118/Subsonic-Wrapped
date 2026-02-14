import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LogOut, Music, Clock, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [current, setCurrent] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [recent, setRecent] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            const [playerRes, statsRes, recentRes] = await Promise.all([
                client.get('/player/current'),
                client.get('/stats/summary'),
                client.get('/stats/recent')
            ]);
            setCurrent(playerRes.data);
            setStats(statsRes.data);
            setRecent(recentRes.data.history);
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            </div>

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
