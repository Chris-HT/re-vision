import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ profile }) {
  const location = useLocation();

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🧠</span>
              <span className="font-bold text-xl text-white">RE-VISION</span>
            </Link>
            
            {profile && (
              <div className="flex items-center space-x-6">
                <Link
                  to="/flashcards"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/flashcards'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Flashcards
                </Link>
                <Link
                  to="/dynamic-test"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/dynamic-test'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Dynamic Test
                </Link>
              </div>
            )}
          </div>

          {profile && (
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{profile.icon}</span>
              <span className="text-white font-medium">{profile.name}</span>
              <Link
                to="/"
                className="ml-4 text-sm text-slate-400 hover:text-white"
              >
                Switch Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}