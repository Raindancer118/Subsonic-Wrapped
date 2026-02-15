import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Copy, Check, Shield } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Fetch full user profile to ensure we have the latest token
        // The auth context might have it, but let's be safe and hit /auth/me or verify
        // Actually, user object from useAuth() comes from local storage or initial load.
        // Let's refetch me to get the token if it was just generated.
        client.get('/auth/me').then(res => {
            if (res.data.user.listenbrainz_token) {
                setToken(res.data.user.listenbrainz_token);
            }
        }).catch(console.error);
    }, []);

    const copyToken = () => {
        if (token) {
            navigator.clipboard.writeText(token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const host = window.location.origin;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                    Settings
                </h1>
                <p className="text-gray-400">Manage your integrations and preferences</p>
            </header>

            <div className="max-w-2xl space-y-6">
                {/* ListenBrainz / Multi-Scrobbler Config */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Shield className="text-green-400" size={24} />
                        Scrobble Integration
                    </h2>
                    <p className="text-gray-300 mb-6 text-sm">
                        Use these credentials to configure <strong>Navidrome</strong> or <strong>Multi-Scrobbler</strong> to push listening history to this dashboard.
                    </p>

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
                            <p className="text-xs text-gray-500 mt-2">
                                Paste this into `multi-scrobbler/config.json` or use as `ND_LISTENBRAINZ_APIKEY` in Navidrome.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                ListenBrainz Base URL
                            </label>
                            <div className="bg-gray-900 p-3 rounded font-mono text-sm text-gray-300 border border-gray-700 select-all">
                                {host}/api/listenbrainz
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                If your client supports a custom URL (e.g. Multi-Scrobbler generic client), use this.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Subsonic Config (Read-only for now) */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 opacity-75">
                    <h2 className="text-lg font-semibold mb-2 text-gray-300">Connected Accounts</h2>
                    <div className="p-4 bg-gray-900/50 rounded flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-200">Subsonic</p>
                            <p className="text-sm text-gray-500">{user?.username}</p>
                        </div>
                        <div className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                            Connected
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
