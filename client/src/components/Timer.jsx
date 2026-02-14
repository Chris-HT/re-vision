export default function Timer({ secondsLeft, percentRemaining }) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  let colorClass = 'text-green-400';
  let bgClass = 'border-green-500';

  if (percentRemaining <= 10) {
    colorClass = 'text-red-400 animate-pulse';
    bgClass = 'border-red-500';
  } else if (percentRemaining <= 25) {
    colorClass = 'text-red-400';
    bgClass = 'border-red-500';
  } else if (percentRemaining <= 50) {
    colorClass = 'text-amber-400';
    bgClass = 'border-amber-500';
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 rounded-lg border ${bgClass}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className={colorClass} />
      </svg>
      <span className={`font-mono text-lg font-bold ${colorClass}`}>{display}</span>
    </div>
  );
}
