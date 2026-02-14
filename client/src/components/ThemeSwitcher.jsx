import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const themes = [
  { id: 'dark', label: 'Dark', icon: '' },
  { id: 'light', label: 'Light', icon: '' },
  { id: 'high-contrast', label: 'High Contrast', icon: '' }
];

export default function ThemeSwitcher({ profileId, onThemeChange }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (themeId) => {
    setTheme(themeId);
    setIsOpen(false);

    // Persist to profile
    if (profileId) {
      try {
        await fetch(`/api/profiles/${profileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: themeId })
        });
      } catch (err) {
        console.error('Failed to save theme preference:', err);
      }
    }

    onThemeChange?.(themeId);
  };

  const currentTheme = themes.find(t => t.id === theme) || themes[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        title="Change theme"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border border-slate-600 bg-slate-800 z-50">
          <div className="py-1">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center space-x-2 ${
                  theme === t.id ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {theme === t.id && <span className="ml-auto text-blue-400">&#10003;</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
