export default function StatsCards({ stats }) {
  const cards = [
    {
      label: 'Current Streak',
      value: `${stats?.currentStreak || 0} days`,
      icon: '',
      color: 'text-orange-400'
    },
    {
      label: 'Cards Studied',
      value: stats?.totalCardsStudied || 0,
      icon: '',
      color: 'text-blue-400'
    },
    {
      label: 'Accuracy',
      value: `${stats?.overallAccuracy || 0}%`,
      icon: '',
      color: 'text-green-400'
    },
    {
      label: 'Due Today',
      value: stats?.dueToday || 0,
      icon: '',
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <div className={`text-3xl font-bold ${card.color} mb-1`}>{card.value}</div>
          <div className="text-sm text-slate-400">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
