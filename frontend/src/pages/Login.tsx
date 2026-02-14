import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Music, Server, Key } from 'lucide-react';

const Login: React.FC = () => {
    const { login, registerSubsonic } = useAuth();
    const [mode, setMode] = useState<'login' | 'register_subsonic'>('login');
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        subsonicUrl: '',
        subsonicUser: '',
        subsonicPass: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (mode === 'login') {
                await login({ username: formData.username, password: formData.password });
            } else {
                await registerSubsonic(formData);
            }
            window.location.href = '/';
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
                <div className="flex justify-center mb-6">
                    <Music className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-center mb-6">
                    {mode === 'login' ? 'Login to Stats' : 'Connect Subsonic'}
                </h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                        {typeof error === 'string' ? error : JSON.stringify(error)}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'login' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {mode === 'register_subsonic' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">App Username</label>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">App Password</label>
                                <input
                                    type="password"
                                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="border-t border-gray-700 pt-4 mt-4">
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Server size={16} /> Subsonic Details
                                </h3>
                                <div className="space-y-3">
                                    <input
                                        type="url"
                                        placeholder="Server URL (e.g. https://navidrome.example.com)"
                                        className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        value={formData.subsonicUrl}
                                        onChange={e => setFormData({ ...formData, subsonicUrl: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Subsonic Username"
                                        className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        value={formData.subsonicUser}
                                        onChange={e => setFormData({ ...formData, subsonicUser: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Subsonic Password/Token"
                                        className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        value={formData.subsonicPass}
                                        onChange={e => setFormData({ ...formData, subsonicPass: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        className="w-full py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition-colors"
                    >
                        {mode === 'login' ? 'Sign In' : 'Register & Connect'}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-4">
                    <div className="text-sm text-gray-400">
                        {mode === 'login' ? (
                            <>
                                New here?{' '}
                                <button onClick={() => setMode('register_subsonic')} className="text-green-500 hover:underline">
                                    Register with Subsonic
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button onClick={() => setMode('login')} className="text-green-500 hover:underline">
                                    Sign In
                                </button>
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/api/auth/spotify'}
                        className="w-full py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Music size={20} /> Spotify
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
