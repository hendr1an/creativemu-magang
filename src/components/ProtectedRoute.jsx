import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="p-10 text-slate-500">Memuat sesi...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) return <Navigate to={`/${role}`} replace />;
  return <Outlet />;
}