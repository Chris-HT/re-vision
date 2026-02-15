import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import PreferencesPanel from './PreferencesPanel';

export default function Navbar({ profile, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isParentOrAdmin = profile?.role === 'admin' || profile?.role === 'parent';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinks = [
    { to: '/flashcards', label: 'Flashcards' },
    { to: '/dynamic-test', label: 'Dynamic Test' },
    { to: '/smart-review', label: 'Smart Review' },
    { to: '/dashboard', label: 'Dashboard' },
  ];

  if (isParentOrAdmin) {
    navLinks.push({ to: '/family', label: 'Family' });
  }

  return (
    <nav style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <span className="text-2xl">&#129504;</span>
              <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>RE-VISION</span>
            </Link>

            {profile && (
              <div className="hidden md:flex items-center space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-blue-600 text-white'
                        : ''
                    }`}
                    style={location.pathname !== link.to ? { color: 'var(--text-secondary)' } : {}}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {profile && (
              <>
                <PreferencesPanel profileId={profile.id} />
                <ThemeSwitcher profileId={profile.id} />
                <span className="hidden md:inline text-2xl">{profile.icon}</span>
                <span style={{ color: 'var(--text-primary)' }} className="hidden md:inline font-medium">{profile.name}</span>
                <button
                  onClick={onLogout}
                  className="hidden md:inline ml-4 text-sm hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Log out
                </button>

                {/* Hamburger button - mobile only */}
                <button
                  className="md:hidden ml-2 p-2 rounded-md focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {profile && mobileMenuOpen && (
        <div
          className="md:hidden border-t"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-blue-600 text-white'
                    : ''
                }`}
                style={location.pathname !== link.to ? { color: 'var(--text-secondary)' } : {}}
              >
                {link.label}
              </Link>
            ))}

            {/* Profile info and logout in mobile menu */}
            <div
              className="border-t mt-2 pt-3 flex items-center justify-between"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{profile.icon}</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{profile.name}</span>
              </div>
              <button
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
                className="text-sm hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
