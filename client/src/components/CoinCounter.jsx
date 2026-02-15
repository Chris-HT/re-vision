import { useGamification } from '../context/GamificationContext';

export default function CoinCounter({ compact = false }) {
  const gam = useGamification();
  if (!gam) return null;

  const { coins } = gam;

  return (
    <div className="flex items-center space-x-1">
      <span className={compact ? 'text-xs' : 'text-sm'}>&#x1FA99;</span>
      <span className={`font-bold text-amber-400 ${compact ? 'text-xs' : 'text-sm'}`}>{coins}</span>
    </div>
  );
}
