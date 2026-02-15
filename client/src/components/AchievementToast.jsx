import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AchievementToast({ icon, label, description, onDismiss }) {
  const { reduceAnimations } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-20 right-4 z-50 flex items-center space-x-3 px-5 py-3 rounded-lg border border-amber-500 bg-amber-900/90 shadow-lg ${
        reduceAnimations ? '' : 'animate-slide-in-right'
      }`}
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="font-bold text-amber-200 text-sm">Achievement Unlocked!</p>
        <p className="font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-amber-100">{description}</p>}
      </div>
    </div>
  );
}
