import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

interface User {
    id: number;
    username: string;
    // ... other fields
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    registerSubsonic: (data: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client.get('/auth/me')
            .then(res => setUser(res.data.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (credentials: any) => {
        const res = await client.post('/auth/login', credentials);
        setUser(res.data.user);
    };

    const register = async (data: any) => {
        const res = await client.post('/auth/register', data);
        setUser(res.data.user);
    };

    const registerSubsonic = async (data: any) => {
        const res = await client.post('/auth/register/subsonic', data);
        setUser(res.data.user);
    };

    const logout = async () => {
        await client.post('/auth/logout');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, registerSubsonic, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
