import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function CategoryStrength({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Category Strength</h3>
        <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          No data yet. Study some cards to see category breakdown.
        </div>
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    name: d.category.length > 20 ? d.category.substring(0, 18) + '...' : d.category
  }));

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Category Strength</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--text-primary)' }}
              formatter={(value, name, props) => [
                `${value}% (${props.payload.correct}/${props.payload.total})`,
                'Accuracy'
              ]}
            />
            <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
              {formatted.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
