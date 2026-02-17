import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function QuestTracker({ profileId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    apiFetch(`/api/progress/${profileId}/quests`)
      .then(res => res.json())
      .then(data => setQuests(data.quests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return null;
  if (quests.length === 0) return null;

  const daily = quests.filter(q => q.type === 'daily');
  const weekly = quests.filter(q => q.type === 'weekly');

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Quests
      </h3>

      {daily.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Daily Quests
          </h4>
          <div className="space-y-3">
            {daily.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </div>
      )}

      {weekly.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Weekly Mission
          </h4>
          <div className="space-y-3">
            {weekly.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest }) {
  const pct = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0;

  return (
    <div
      className={`rounded-lg p-3 border ${quest.completed ? 'border-green-600/40' : ''}`}
      style={!quest.completed ? {
        backgroundColor: 'var(--bg-input)',
        borderColor: 'var(--border-color)'
      } : {
        backgroundColor: 'rgba(34, 197, 94, 0.08)'
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {quest.completed && <span className="text-green-400 text-sm">&#10003;</span>}
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {quest.title}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {quest.xpReward} XP + {quest.coinReward} coins
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div
          className={`h-full transition-all duration-300 rounded-full ${quest.completed ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {quest.progress}/{quest.target}
        </span>
        {quest.completed && (
          <span className="text-xs text-green-400 font-medium">Complete!</span>
        )}
      </div>
    </div>
  );
}
