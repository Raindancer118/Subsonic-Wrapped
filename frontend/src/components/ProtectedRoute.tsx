import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>; // TODO: Better loading spinner

    return user ? <Outlet /> : <Navigate to="/login" />;
};
