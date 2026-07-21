import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="relative flex items-center justify-center">
          {/* Animated Spinner Rings */}
          <div className="absolute w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          <div className="absolute w-10 h-10 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin animate-reverse"></div>
        </div>
        <span className="mt-8 text-slate-400 font-medium tracking-wider text-sm animate-pulse">
          VERIFYING ACCESS...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
