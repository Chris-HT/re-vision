import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export default function PreferencesPanel({ profileId }) {
  const {
    fontSize, setFontSize,
    reduceAnimations, setReduceAnimations,
    literalLanguage, setLiteralLanguage
  } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const persist = (updates) => {
    if (!profileId) return;
    apiFetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }).catch(err => console.error('Failed to save preference:', err));
  };

  const handleFontSize = (size) => {
    setFontSize(size);
    persist({ fontSize: size });
  };

  const handleReduceAnimations = () => {
    const next = !reduceAnimations;
    setReduceAnimations(next);
    persist({ reduceAnimations: next ? 1 : 0 });
  };

  const handleLiteralLanguage = () => {
    const next = !literalLanguage;
    setLiteralLanguage(next);
    persist({ literalLanguage: next ? 1 : 0 });
  };

  const fontSizes = [
    { id: 'small', label: 'A', title: 'Small text' },
    { id: 'medium', label: 'A', title: 'Medium text' },
    { id: 'large', label: 'A', title: 'Large text' }
  ];

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md hover:opacity-80 transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
        title="Preferences"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50 p-4 space-y-4"
          style={{
            backgroundColor: 'var(--bg-card-solid)',
            borderColor: 'var(--border-color)'
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Preferences
          </h3>

          {/* Font size */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Text size
            </label>
            <div className="flex gap-2">
              {fontSizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleFontSize(s.id)}
                  title={s.title}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                    fontSize === s.id ? 'bg-blue-600 text-white' : ''
                  }`}
                  style={fontSize !== s.id ? {
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-secondary)'
                  } : undefined}
                >
                  <span style={{ fontSize: s.id === 'small' ? '12px' : s.id === 'large' ? '20px' : '16px' }}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reduce animations */}
          <div>
            <button
              onClick={handleReduceAnimations}
              className="w-full flex items-center justify-between py-2 px-3 rounded-md transition-colors"
              style={{ backgroundColor: 'var(--bg-input)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Reduce animations
              </span>
              <span className={`w-9 h-5 rounded-full relative transition-colors ${
                reduceAnimations ? 'bg-blue-600' : 'bg-slate-500'
              }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  reduceAnimations ? 'left-[18px]' : 'left-0.5'
                }`} />
              </span>
            </button>
          </div>

          {/* Literal language */}
          <div>
            <button
              onClick={handleLiteralLanguage}
              className="w-full flex items-center justify-between py-2 px-3 rounded-md transition-colors"
              style={{ backgroundColor: 'var(--bg-input)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Clear, direct language
              </span>
              <span className={`w-9 h-5 rounded-full relative transition-colors ${
                literalLanguage ? 'bg-blue-600' : 'bg-slate-500'
              }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  literalLanguage ? 'left-[18px]' : 'left-0.5'
                }`} />
              </span>
            </button>
            <p className="text-xs mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
              AI feedback uses plain language only
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
