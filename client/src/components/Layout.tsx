import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Users, Music, LogOut, User } from 'lucide-react';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
                <Music className="w-6 h-6" />
                Festival Planner
              </Link>

              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                <Link
                  to="/events"
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Events
                </Link>
                <Link
                  to="/groups"
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Groups
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {user?.displayName}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
