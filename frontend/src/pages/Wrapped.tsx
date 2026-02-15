import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, Calendar, Users } from 'lucide-react';
import axios from 'axios';

interface WrappedStats {
    year: number;
    total_plays: number;
    total_time_ms: number;
    unique_artists: number;
    unique_tracks: number;
    top_artist: {
        artist: string;
        play_count: number;
        total_time_ms: number;
        image_url: string;
        top_track: string;
    } | null;
    top_songs: Array<{
        title: string;
        artist: string;
        image_url: string;
        play_count: number;
    }>;
    top_genres: Array<{
        genre: string;
        play_count: number;
    }>;
    audio_day: Array<{
        time_of_day: string;
        count: number;
    }>;
    listening_age: number;
    personality: {
        archetype: string;
        traits: string[];
        stats: {
            diversity: number;
            top_artist_share: number;
        };
    };
}

const Slide: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
    <motion.div
        className={`fixed inset-0 flex flex-col items-center justify-center p-8 text-white ${color}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.5 }}
    >
        {children}
    </motion.div>
);

const Wrapped: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<WrappedStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [aiData, setAiData] = useState<{ roast: string; vibe: string } | null>(null);

    useEffect(() => {
        const fetchWrapped = async () => {
            try {
                const res = await axios.get('/api/wrapped');
                setData(res.data);

                // Fetch AI Data independently - don't block main load
                axios.post('/api/wrapped/ai-analysis', { year: res.data.year })
                    .then(aiRes => setAiData(aiRes.data))
                    .catch(err => console.error("AI Analysis failed", err));

            } catch (err) {
                console.error("Failed to load wrapped", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWrapped();
    }, []);

    const slides = [
        'intro',
        'minutes',
        'audio_day',
        'listening_age',
        'vibe',
        'top_artist', // Intentionally singular focus
        'top_songs',
        'roast',
        'personality',
        'summary'
    ];

    useEffect(() => {
        if (!data || isPaused) return;

        // Longer duration for text-heavy AI slides
        const duration = (slides[currentSlide] === 'roast' || slides[currentSlide] === 'vibe' || slides[currentSlide] === 'personality') ? 8000 : 6000;

        const timer = setTimeout(() => {
            if (currentSlide < slides.length - 1) {
                setCurrentSlide(prev => prev + 1);
            }
        }, duration);

        return () => clearTimeout(timer);
    }, [currentSlide, data, isPaused]);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading your story...</div>;
    if (!data) return <div className="min-h-screen bg-black text-white flex items-center justify-center">No data found for this year.</div>;

    const renderSlide = () => {
        switch (slides[currentSlide]) {
            case 'intro':
                return (
                    <Slide color="bg-gradient-to-br from-pink-600 to-purple-700">
                        <h1 className="text-6xl font-black mb-4 text-center">Your {data.year}</h1>
                        <p className="text-2xl opacity-80">Wrapped</p>
                    </Slide>
                );
            case 'vibe':
                return (
                    <Slide color="bg-gradient-to-t from-indigo-900 via-purple-900 to-slate-900">
                        <div className="text-center max-w-2xl">
                            <h2 className="text-3xl font-bold mb-12 opacity-80 tracking-widest uppercase">The Vibe</h2>
                            {aiData ? (
                                <div className="text-3xl md:text-5xl font-serif leading-tight italic">
                                    "{aiData.vibe}"
                                </div>
                            ) : (
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="h-4 bg-white/20 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                                    <p className="mt-8 text-sm opacity-50">Consulting the oracles...</p>
                                </div>
                            )}
                        </div>
                    </Slide>
                );
            case 'roast':
                return (
                    <Slide color="bg-gradient-to-br from-red-600 to-orange-600">
                        <div className="text-center max-w-2xl relative">
                            <h2 className="text-6xl font-black mb-12 transform -rotate-2">ROASTED</h2>
                            {aiData ? (
                                <div className="bg-white text-black p-8 rounded-2xl shadow-xl transform rotate-1">
                                    <p className="text-xl md:text-2xl font-bold font-mono">
                                        {aiData.roast}
                                    </p>
                                </div>
                            ) : (
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="h-32 bg-white/20 rounded w-full"></div>
                                    <p className="mt-8 text-sm opacity-50">Preparing the burn...</p>
                                </div>
                            )}
                        </div>
                    </Slide>
                );
            case 'minutes':
                return (
                    <Slide color="bg-gradient-to-br from-blue-600 to-cyan-500">
                        <div className="text-center">
                            <p className="text-xl mb-4 opacity-80">You spent</p>
                            <h2 className="text-8xl font-black mb-2">{(data.total_time_ms / 60000).toFixed(0)}</h2>
                            <p className="text-3xl font-bold mb-8">Minutes</p>
                            <p className="text-lg opacity-60">listening to music this year.</p>
                            <div className="mt-12 p-4 bg-white/10 rounded-xl backdrop-blur-md">
                                <p className="text-sm">That's like listening non-stop for</p>
                                <p className="text-2xl font-bold">{(data.total_time_ms / (1000 * 60 * 60 * 24)).toFixed(1)} Days</p>
                            </div>
                        </div>
                    </Slide>
                );
            case 'audio_day':
                const topTime = data.audio_day[0];
                return (
                    <Slide color="bg-gradient-to-br from-indigo-900 to-black">
                        <div className="text-center">
                            <h2 className="text-4xl font-bold mb-8">Your Audio Day</h2>
                            <Clock size={64} className="mx-auto mb-6 opacity-80" />
                            <p className="text-xl mb-2">You listened most during the</p>
                            <h1 className="text-6xl font-black mb-4 text-yellow-400">{topTime?.time_of_day || 'Day'}</h1>
                            <div className="space-y-4 mt-12 w-full max-w-sm mx-auto">                                {data.audio_day?.map((d: any) => (
                                <div key={d.time_of_day} className="flex items-center gap-4">
                                    <div className="w-24 text-right opacity-70">{d.time_of_day}</div>
                                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white" style={{ width: `${(d.count / (data.audio_day[0].count)) * 100}%` }}></div>
                                    </div>
                                </div>
                            )) || <p className="opacity-50">No data</p>}
                            </div>
                        </div>
                    </Slide>
                );
            case 'listening_age':
                return (
                    <Slide color="bg-gradient-to-tl from-amber-700 to-orange-500">
                        <div className="text-center">
                            <h2 className="text-4xl font-bold mb-12">Your Listening Age</h2>
                            <Calendar size={80} className="mx-auto mb-6 opacity-80" />
                            <h1 className="text-8xl font-black mb-4">{data.listening_age || 'Unknown'}</h1>
                            <p className="text-xl opacity-80 max-w-md mx-auto">
                                {data.listening_age && data.listening_age < 2010 ? "You've got an old soul." : "You're living in the moment."}
                            </p>
                        </div>
                    </Slide>
                );
            case 'top_artist':
                return (
                    <Slide color="bg-black">
                        {data.top_artist?.image_url && (
                            <img src={data.top_artist.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        )}
                        <div className="relative z-10 text-center">
                            <p className="text-xl mb-4 font-bold uppercase tracking-widest">Top Artist</p>
                            <h1 className="text-6xl font-black mb-6">{data.top_artist?.artist || 'Unknown'}</h1>
                            <div className="bg-black/50 backdrop-blur-md p-6 rounded-xl inline-block">
                                <p className="text-4xl font-bold">{data.top_artist?.play_count || 0} Plays</p>
                                <p className="text-sm opacity-70 mt-2">You spent {((data.top_artist?.total_time_ms || 0) / 60000).toFixed(0)} minutes together</p>
                            </div>
                        </div>
                    </Slide>
                );
            case 'top_songs':
                return (
                    <Slide color="bg-gradient-to-br from-green-600 to-emerald-800">
                        <div className="w-full max-w-md">
                            <h2 className="text-4xl font-black mb-8 text-center">Top Songs</h2>
                            <div className="space-y-4">
                                {(data.top_songs || []).map((song, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-black/20 p-3 rounded-lg backdrop-blur-sm">
                                        <div className="text-2xl font-bold opacity-50 w-8">{i + 1}</div>
                                        {song.image_url && <img src={song.image_url} className="w-12 h-12 rounded" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate">{song.title}</p>
                                            <p className="text-sm opacity-70 truncate">{song.artist}</p>
                                        </div>
                                        <div className="text-sm font-mono opacity-60">{song.play_count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Slide>
                );
            case 'personality':
                return (
                    <Slide color="bg-gradient-to-tr from-fuchsia-600 to-purple-600">
                        <div className="text-center">
                            <div className="w-32 h-32 mx-auto bg-white text-purple-600 rounded-full flex items-center justify-center mb-8">
                                <Users size={64} />
                            </div>
                            <p className="text-xl mb-2 opacity-80">We've successfully analyzed your brain.</p>
                            <p className="text-xl mb-6 opacity-80">You are...</p>
                            <h1 className="text-6xl font-black mb-8 text-white drop-shadow-lg">{data.personality?.archetype || 'Mystery'}</h1>
                            <div className="space-y-2">
                                {(data.personality?.traits || []).map((trait: string, i: number) => (
                                    <p key={i} className="text-lg font-medium bg-black/20 py-1 px-4 rounded-full inline-block">{trait}</p>
                                ))}
                            </div>
                        </div>
                    </Slide>
                );
            case 'summary':
                return (
                    <Slide color="bg-gradient-to-b from-gray-900 to-black">
                        <div className="text-center w-full max-w-sm bg-[#1ed760] text-black p-8 rounded-3xl shadow-2xl transform scale-90">
                            <h2 className="text-3xl font-black mb-6">Wrapped {data.year}</h2>

                            <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                                <div>
                                    <p className="text-xs font-bold uppercase opacity-60">Top Artist</p>
                                    <p className="font-bold truncate">{data.top_artist?.artist || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase opacity-60">Minutes</p>
                                    <p className="font-bold">{(data.total_time_ms / 60000).toFixed(0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase opacity-60">Top Genre</p>
                                    <p className="font-bold truncate">{data.top_genres?.[0]?.genre || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase opacity-60">Archetype</p>
                                    <p className="font-bold truncate">{data.personality?.archetype || '-'}</p>
                                </div>
                            </div>

                            <div className="bg-black/10 rounded-xl p-4 mb-6">
                                <p className="text-xs font-bold uppercase opacity-60 mb-2 text-left">Top Songs</p>
                                {(data.top_songs || []).slice(0, 5).map((s, i) => (
                                    <div key={i} className="flex justify-between text-sm mb-1">
                                        <span className="truncate flex-1 text-left mr-2">{i + 1}. {s.title}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center">
                                <div className="text-[10px] font-mono opacity-50">SUBSONIC WRAPPED</div>
                            </div>
                        </div>
                        <button onClick={() => navigate('/')} className="mt-8 bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                            Back to Dashboard
                        </button>
                    </Slide>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50">
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
                {slides.map((_, i) => (
                    <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white"
                            initial={{ width: i < currentSlide ? '100%' : '0%' }}
                            animate={{ width: i < currentSlide ? '100%' : (i === currentSlide ? '100%' : '0%') }}
                            transition={{ duration: i === currentSlide ? 6 : 0, ease: 'linear' }}
                        />
                    </div>
                ))}
            </div>

            {/* Controls */}
            <button onClick={() => navigate('/')} className="absolute top-4 right-4 z-50 text-white/50 hover:text-white">
                <X size={24} />
            </button>
            <button onClick={() => setIsPaused(!isPaused)} className="absolute top-4 right-16 z-50 text-white/50 hover:text-white">
                {isPaused ? <Play size={24} /> : <div className="font-mono text-xs border border-white/50 px-2 py-1 rounded">PAUSE</div>}
            </button>

            {/* Tap Zones */}
            <div className="absolute inset-0 flex z-40">
                <div className="w-1/3 h-full" onClick={handlePrev}></div>
                <div className="w-1/3 h-full" onClick={() => setIsPaused(!isPaused)}></div>
                <div className="w-1/3 h-full" onClick={handleNext}></div>
            </div>

            <AnimatePresence mode="wait">
                {renderSlide()}
            </AnimatePresence>
        </div>
    );
};

export default Wrapped;
