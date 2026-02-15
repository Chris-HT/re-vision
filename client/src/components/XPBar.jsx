import { useGamification } from '../context/GamificationContext';

export default function XPBar({ compact = false }) {
  const gam = useGamification();
  if (!gam) return null;

  const { level, xpProgress, xpRequired } = gam;
  const percent = xpRequired > 0 ? Math.min((xpProgress / xpRequired) * 100, 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-xs font-bold text-purple-400">Lv{level}</span>
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-bold text-purple-400">Lv{level}</span>
      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
