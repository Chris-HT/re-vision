import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../utils/api';

export default function FocusModeToggle({ profileId }) {
  const { focusMode, setFocusMode } = useTheme();

  const toggle = () => {
    const next = !focusMode;
    setFocusMode(next);
    if (profileId) {
      apiFetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({ focusMode: next ? 1 : 0 })
      }).catch(err => console.error('Failed to save focus mode:', err));
    }
  };

  if (focusMode) {
    return (
      <button
        onClick={toggle}
        className="fixed top-3 left-3 z-50 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
        style={{
          backgroundColor: 'var(--bg-card-solid)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)'
        }}
      >
        Exit Focus Mode
      </button>
    );
  }

  return null;
}
