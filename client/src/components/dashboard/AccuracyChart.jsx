import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function AccuracyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Accuracy Over Time</h3>
        <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          No data yet. Start studying to see your accuracy trend.
        </div>
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }));

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Accuracy Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--text-primary)' }}
              itemStyle={{ color: '#3b82f6' }}
              formatter={(value) => [`${value}%`, 'Accuracy']}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#accuracyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
