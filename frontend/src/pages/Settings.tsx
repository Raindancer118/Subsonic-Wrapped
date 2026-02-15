import { useEffect, useState } from 'react';
// import { useAuth } from '../context/AuthContext'; // Unused
import client from '../api/client';
import { Copy, Check, Shield, Server, Plug, Plus, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Settings() {
    // const { user } = useAuth(); // Unused
    const [token, setToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Data
    const [connections, setConnections] = useState<{ spotify: boolean, subsonic: any[] }>({ spotify: false, subsonic: [] });
    const [articles, setArticles] = useState<any[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
    const [articleContent, setArticleContent] = useState<string>('');

    // Form
    const [showAddServer, setShowAddServer] = useState(false);
    const [newServer, setNewServer] = useState({ url: '', username: '', password: '', name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchKB();
    }, []);

    const fetchSettings = () => {
        client.get('/auth/me').then(res => {
            if (res.data.user.listenbrainz_token) setToken(res.data.user.listenbrainz_token);
        });
        client.get('/settings/connections').then(res => setConnections(res.data));
    };

    const fetchKB = () => {
        client.get('/settings/kb').then(res => setArticles(res.data));
    };

    const loadArticle = async (filename: string) => {
        const res = await client.get(`/settings/kb/${filename}`);
        setArticleContent(res.data);
        setSelectedArticle(filename);
    };

    const copyToken = () => {
        if (token) {
            navigator.clipboard.writeText(token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAddServer = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await client.post('/settings/subsonic', newServer);
            setNewServer({ url: '', username: '', password: '', name: '' });
            setShowAddServer(false);
            fetchSettings();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add server');
        } finally {
            setLoading(false);
        }
    };

    const deleteServer = async (id: number) => {
        if (confirm('Are you sure you want to remove this server?')) {
            await client.delete(`/settings/subsonic/${id}`);
            fetchSettings();
        }
    };

    const host = window.location.origin;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                    Settings
                </h1>
                <p className="text-gray-400">Manage your integrations, connections, and support</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Integrations & Connections */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Connections */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Plug className="text-blue-400" size={24} />
                            Connections
                        </h2>

                        {/* Spotify */}
                        <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#1DB954] p-2 rounded-full text-black">
                                    <ExternalLink size={20} />
                                </div>
                                <div>
                                    <p className="font-bold">Spotify</p>
                                    <p className="text-xs text-gray-400">{connections.spotify ? 'Connected' : 'Not Connected'}</p>
                                </div>
                            </div>
                            {connections.spotify ? (
                                <span className="text-green-400 text-sm flex items-center gap-1"><Check size={16} /> Active</span>
                            ) : (
                                <a href="/api/auth/spotify" className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded text-sm transition-colors">
                                    Connect
                                </a>
                            )}
                        </div>

                        {/* Subsonic Servers */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Subsonic Servers</h3>
                                <button onClick={() => setShowAddServer(!showAddServer)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded flex items-center gap-1">
                                    <Plus size={14} /> Add Server
                                </button>
                            </div>

                            {showAddServer && (
                                <form onSubmit={handleAddServer} className="bg-gray-700/50 p-4 rounded mb-4 border border-gray-600">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <input
                                            placeholder="Server URL (https://...)"
                                            className="col-span-2 bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                                            value={newServer.url}
                                            onChange={e => setNewServer({ ...newServer, url: e.target.value })}
                                            required
                                        />
                                        <input
                                            placeholder="Username"
                                            className="bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                                            value={newServer.username}
                                            onChange={e => setNewServer({ ...newServer, username: e.target.value })}
                                            required
                                        />
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            className="bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                                            value={newServer.password}
                                            onChange={e => setNewServer({ ...newServer, password: e.target.value })}
                                            required
                                        />
                                        <input
                                            placeholder="Friendly Name (Optional)"
                                            className="col-span-2 bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                                            value={newServer.name}
                                            onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                                        />
                                    </div>
                                    {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowAddServer(false)} className="px-3 py-1 text-sm text-gray-400 hover:text-white">Cancel</button>
                                        <button type="submit" disabled={loading} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm disabled:opacity-50">
                                            {loading ? 'Verifying...' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {connections.subsonic.map((server: any) => (
                                <div key={server.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <Server size={18} className="text-orange-400" />
                                        <div>
                                            <p className="font-bold text-sm">{server.name || server.url}</p>
                                            <p className="text-xs text-gray-500">{server.url}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteServer(server.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {connections.subsonic.length === 0 && !showAddServer && (
                                <p className="text-sm text-gray-500 italic">No servers connected.</p>
                            )}
                        </div>
                    </div>

                    {/* ListenBrainz / Multi-Scrobbler Config */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Shield className="text-green-400" size={24} />
                            Scrobble Integration
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                    ListenBrainz API Token
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="bg-gray-900 p-3 rounded font-mono text-sm flex-1 truncate text-gray-200 border border-gray-700">
                                        {token || 'Loading...'}
                                    </div>
                                    <button
                                        onClick={copyToken}
                                        className="p-3 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white"
                                        title="Copy Token"
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                    ListenBrainz Base URL
                                </label>
                                <div className="bg-gray-900 p-3 rounded font-mono text-sm text-gray-300 border border-gray-700 select-all">
                                    {host}/api/listenbrainz
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Knowledge Base */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-fit">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="text-yellow-400" size={24} />
                        Knowledge Base
                    </h2>

                    {!selectedArticle ? (
                        <ul className="space-y-2">
                            {articles.map(article => (
                                <li key={article.id}>
                                    <button
                                        onClick={() => loadArticle(article.id)}
                                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors flex justify-between items-center"
                                    >
                                        {article.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="animate-fade-in">
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="text-xs text-blue-400 hover:underline mb-4"
                            >
                                &larr; Back to Articles
                            </button>
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {articleContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
