import { Link, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar({ profile }) {
  const location = useLocation();

  return (
    <nav style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">&#129504;</span>
              <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>RE-VISION</span>
            </Link>

            {profile && (
              <div className="flex items-center space-x-4">
                <Link
                  to="/flashcards"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/flashcards'
                      ? 'bg-blue-600 text-white'
                      : ''
                  }`}
                  style={location.pathname !== '/flashcards' ? { color: 'var(--text-secondary)' } : {}}
                >
                  Flashcards
                </Link>
                <Link
                  to="/dynamic-test"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/dynamic-test'
                      ? 'bg-blue-600 text-white'
                      : ''
                  }`}
                  style={location.pathname !== '/dynamic-test' ? { color: 'var(--text-secondary)' } : {}}
                >
                  Dynamic Test
                </Link>
                <Link
                  to="/smart-review"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/smart-review'
                      ? 'bg-blue-600 text-white'
                      : ''
                  }`}
                  style={location.pathname !== '/smart-review' ? { color: 'var(--text-secondary)' } : {}}
                >
                  Smart Review
                </Link>
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/dashboard'
                      ? 'bg-blue-600 text-white'
                      : ''
                  }`}
                  style={location.pathname !== '/dashboard' ? { color: 'var(--text-secondary)' } : {}}
                >
                  Dashboard
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {profile && (
              <>
                <ThemeSwitcher profileId={profile.id} />
                <span className="text-2xl">{profile.icon}</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{profile.name}</span>
                <Link
                  to="/"
                  className="ml-4 text-sm hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Switch Profile
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
