import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GitBranch, History, LogOut, Code } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-950 border border-zinc-200 shadow-sm group-hover:scale-105 transition-transform duration-200">
            <GitBranch className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            RepoScope
          </span>
        </Link>

        {/* Navigation & Auth */}
        {user ? (
          <nav className="flex items-center gap-6">
            {/* Dashboard Link */}
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white ${
                isActive('/') ? 'text-white border-b-2 border-white py-1.5' : 'text-zinc-400 py-1.5'
              }`}
            >
              <Code className="h-4 w-4" />
              Analyzer
            </Link>

            {/* History Link */}
            <Link
              to="/history"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white ${
                isActive('/history') ? 'text-white border-b-2 border-white py-1.5' : 'text-zinc-400 py-1.5'
              }`}
            >
              <History className="h-4 w-4" />
              History
            </Link>

            {/* User Dropdown/Card */}
            <div className="h-6 w-px bg-zinc-800" />

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-xs font-semibold text-zinc-400 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-md max-w-[200px] truncate">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 hover:border-red-500/30 hover:bg-red-500/10 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </nav>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-white hover:bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 transition-all duration-200"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
