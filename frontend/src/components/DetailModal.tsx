import React from 'react';
import { X, Clock, PlayCircle, Calendar, Disc } from 'lucide-react';

interface DetailModalProps {
    type: 'track' | 'artist' | 'album' | null;
    data: any;
    onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ type, data, onClose }) => {
    if (!type || !data) return null;

    const formatMs = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    };

    const formatHours = (ms: number) => {
        return (ms / (1000 * 60 * 60)).toFixed(1) + ' hrs';
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="relative">
                    {data.image_url ? (
                        <div className="h-48 w-full overflow-hidden relative">
                            <img src={data.image_url} className="w-full h-full object-cover opacity-50 blur-sm" />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                            <img src={data.image_url} className="absolute bottom-4 left-6 w-32 h-32 rounded-lg shadow-xl z-10 object-cover" />
                        </div>
                    ) : (
                        <div className="h-32 bg-gradient-to-r from-green-900 to-gray-900 relative">
                            <div className="absolute bottom-4 left-6 w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center shadow-xl">
                                <Disc size={40} className="text-gray-500" />
                            </div>
                        </div>
                    )}

                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
                        <X size={20} />
                    </button>

                    <div className="px-6 pt-2 pb-6">
                        <div className="pl-36 md:pl-40">
                            <h2 className="text-3xl font-bold text-white mb-1">{data.title || data.name || data.album}</h2>
                            <p className="text-xl text-gray-400">{data.artist}</p>
                            {type === 'track' && data.album && <p className="text-sm text-gray-500">{data.album}</p>}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-8 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs uppercase font-bold mb-1">Total Plays</p>
                            <p className="text-2xl font-bold text-green-400">{data.play_count}</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs uppercase font-bold mb-1">Total Time</p>
                            <p className="text-2xl font-bold text-blue-400">{formatHours(data.total_time_ms || 0)}</p>
                        </div>
                        {type === 'track' && (
                            <>
                                <div className="bg-gray-800 p-4 rounded-xl">
                                    <p className="text-gray-400 text-xs uppercase font-bold mb-1">Bits</p>
                                    <p className="text-xl font-bold text-gray-300">{data.bitrate || '?'} kbps</p>
                                </div>
                                <div className="bg-gray-800 p-4 rounded-xl">
                                    <p className="text-gray-400 text-xs uppercase font-bold mb-1">Released</p>
                                    <p className="text-xl font-bold text-gray-300">{data.year || 'Unknown'}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Artist: Top Tracks */}
                    {type === 'artist' && data.top_tracks && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PlayCircle size={20} /> Top Tracks</h3>
                            <div className="space-y-2">
                                {data.top_tracks.map((t: any, i: number) => (
                                    <div key={i} className="flex items-center p-2 hover:bg-gray-800 rounded transition-colors">
                                        <span className="w-8 text-gray-500 font-bold">{i + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-200">{t.title}</p>
                                            <p className="text-xs text-gray-500">{t.album}</p>
                                        </div>
                                        <span className="text-sm text-gray-400">{t.play_count} plays</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Artist: Albums */}
                    {type === 'artist' && data.albums && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Disc size={20} /> Albums</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {data.albums.map((a: any, i: number) => (
                                    <div key={i} className="bg-gray-800 p-3 rounded-lg">
                                        <div className="aspect-square bg-gray-700 rounded mb-2 overflow-hidden">
                                            {a.image_url ? <img src={a.image_url} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <p className="font-bold text-sm truncate">{a.album}</p>
                                        <p className="text-xs text-gray-500">{a.play_count} plays</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Album: Tracklist */}
                    {type === 'album' && data.tracks && (
                        <div>
                            <h3 className="text-lg font-bold mb-4">Tracklist</h3>
                            <div className="space-y-1">
                                {data.tracks.map((t: any, i: number) => (
                                    <div key={i} className="flex items-center p-2 hover:bg-gray-800 rounded">
                                        <span className="w-8 text-gray-500 text-sm">{t.track_number || i + 1}</span>
                                        <p className="flex-1 text-gray-200">{t.title}</p>
                                        <span className="text-sm text-gray-500">{t.play_count} plays</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Track: History */}
                    {type === 'track' && data.history && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar size={20} /> Recent Plays</h3>
                            <div className="space-y-2">
                                {data.history.map((h: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm text-gray-400 border-b border-gray-800 pb-2">
                                        <span>{new Date(h.played_at).toLocaleString()}</span>
                                        <span className="capitalize">{h.source}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
