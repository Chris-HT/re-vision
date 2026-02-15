import { useGamification } from '../context/GamificationContext';

export default function TokenCounter({ compact = false }) {
  const gam = useGamification();
  if (!gam) return null;

  const { tokens } = gam;

  return (
    <div className="flex items-center space-x-1">
      <span className={compact ? 'text-xs' : 'text-sm'}>💷</span>
      <span className={`font-bold text-emerald-400 ${compact ? 'text-xs' : 'text-sm'}`}>{tokens}</span>
    </div>
  );
}
