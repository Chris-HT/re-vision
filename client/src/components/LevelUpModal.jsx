import { useTheme } from '../context/ThemeContext';

export default function LevelUpModal({ level, onDismiss }) {
  const { reduceAnimations } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="relative rounded-2xl p-8 text-center max-w-sm mx-4 border border-purple-500"
        style={{ backgroundColor: 'var(--bg-card-solid)' }}
      >
        {!reduceAnimations && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-lg animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              >
                {['&#127881;', '&#11088;', '&#127942;', '&#128640;'][i % 4]}
              </span>
            ))}
          </div>
        )}

        <div className="text-5xl mb-4">&#127775;</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Level Up!
        </h2>
        <p className="text-4xl font-bold text-purple-400 mb-2">Level {level}</p>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Keep up the great work!</p>
        <button
          onClick={onDismiss}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
