import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function RewardPopup({ type, amount, label, onDismiss }) {
  const { reduceAnimations } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 1500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isXP = type === 'xp';
  const colorClass = isXP ? 'text-purple-300' : 'text-amber-300';
  const bgClass = isXP
    ? 'bg-purple-900/80 border-purple-500'
    : 'bg-amber-900/80 border-amber-500';

  if (reduceAnimations) {
    return (
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border ${bgClass}`}>
        <span className={`font-bold ${colorClass}`}>{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border ${bgClass} animate-reward-popup`}
    >
      <span className={`font-bold ${colorClass}`}>{label}</span>
    </div>
  );
}
