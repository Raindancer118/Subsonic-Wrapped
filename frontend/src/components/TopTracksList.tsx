import React from 'react';

interface Track {
    id: number;
    title: string;
    artist: string;
    album?: string;
    image_url?: string;
    play_count: number;
    total_duration_ms: number; // Optional visual?
}

interface TopTracksListProps {
    tracks: Track[];
}

const TopTracksList: React.FC<TopTracksListProps> = ({ tracks }) => {
    if (!tracks || tracks.length === 0) {
        return <div className="text-gray-500 text-sm">No track data available for this period.</div>;
    }

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="text-green-400 mr-2">🎵</span> Top Tracks
            </h2>
            <div className="space-y-3">
                {tracks.map((track, index) => (
                    <div key={track.id} className="flex items-center p-2 hover:bg-gray-700 rounded-lg transition-colors group cursor-pointer">
                        <div className="w-8 text-center text-gray-500 font-bold mr-3">{index + 1}</div>
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-900 rounded overflow-hidden mr-4">
                            {track.image_url ? (
                                <img src={track.image_url} alt={track.album} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    <span className="text-xs">N/A</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="text-white font-medium truncate group-hover:text-green-400 transition-colors">
                                {track.title}
                            </div>
                            <div className="text-gray-400 text-sm truncate">
                                {track.artist}
                            </div>
                        </div>
                        <div className="text-right ml-4">
                            <div className="text-white font-bold">{track.play_count}</div>
                            <div className="text-xs text-gray-500">plays</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopTracksList;
