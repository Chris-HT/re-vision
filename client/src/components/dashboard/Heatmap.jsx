export default function Heatmap({ data }) {
  // Generate last 12 weeks of dates
  const today = new Date();
  const days = [];

  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      count: data[dateStr] || 0,
      dayOfWeek: date.getDay(),
      label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    });
  }

  // Group into weeks (columns)
  const weeks = [];
  let currentWeek = [];
  for (const day of days) {
    currentWeek.push(day);
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const maxCount = Math.max(1, ...Object.values(data || {}));

  function getColor(count) {
    if (count === 0) return '';
    const intensity = count / maxCount;
    if (intensity <= 0.25) return 'bg-emerald-900';
    if (intensity <= 0.5) return 'bg-emerald-700';
    if (intensity <= 0.75) return 'bg-emerald-500';
    return 'bg-emerald-400';
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Study Activity</h3>
      <div className="flex">
        <div className="flex flex-col justify-between mr-2 text-xs" style={{ height: '7rem', color: 'var(--text-muted)' }}>
          {dayLabels.map((label, i) => (
            <span key={i} className="h-3 leading-3">{label}</span>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {/* Pad first week if it doesn't start on Sunday */}
              {wi === 0 && week[0]?.dayOfWeek > 0 && (
                Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                  <div key={`pad-${i}`} className="w-3 h-3 rounded-sm" />
                ))
              )}
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                  style={day.count === 0 ? { backgroundColor: 'var(--bg-input)' } : {}}
                  title={`${day.label}: ${day.count} cards`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end mt-3 space-x-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--bg-input)' }} />
        <div className="w-3 h-3 rounded-sm bg-emerald-900" />
        <div className="w-3 h-3 rounded-sm bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        <span>More</span>
      </div>
    </div>
  );
}
