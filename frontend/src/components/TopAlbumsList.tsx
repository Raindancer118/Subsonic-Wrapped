import React from 'react';

interface Album {
    album: string;
    artist: string;
    image_url?: string;
    play_count: number;
}

interface TopAlbumsListProps {
    albums: Album[];
}

const TopAlbumsList: React.FC<TopAlbumsListProps> = ({ albums }) => {
    if (!albums || albums.length === 0) {
        return <div className="text-gray-500 text-sm">No album data available for this period.</div>;
    }

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="text-blue-400 mr-2">💿</span> Top Albums
            </h2>
            <div className="grid grid-cols-2 gap-4">
                {albums.slice(0, 6).map((album, index) => (
                    <div key={index} className="bg-gray-900 rounded-lg p-3 hover:bg-gray-750 transition-colors group cursor-pointer">
                        <div className="aspect-square bg-gray-800 rounded mb-3 overflow-hidden shadow-md">
                            {album.image_url ? (
                                <img src={album.image_url} alt={album.album} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    <span className="text-2xl">💿</span>
                                </div>
                            )}
                        </div>
                        <div className="font-bold text-white text-sm truncate group-hover:text-blue-400 transition-colors">
                            {album.album}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                            {album.artist}
                        </div>
                        <div className="mt-2 text-xs font-mono text-gray-500">
                            {album.play_count} plays
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopAlbumsList;
