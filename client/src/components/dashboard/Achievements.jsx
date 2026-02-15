import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function Achievements({ profileId }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    apiFetch(`/api/gamification/${profileId}/achievements`)
      .then(res => res.json())
      .then(data => setAchievements(data.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Achievements</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlockedAt);
  const locked = achievements.filter(a => !a.unlockedAt);

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Achievements</h2>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {unlocked.length} / {achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {unlocked.map(a => (
          <div
            key={a.id}
            className="rounded-lg p-3 border text-center"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-3xl mb-1">{a.icon}</div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.description}</p>
            <p className="text-xs mt-1 text-green-400">
              {new Date(a.unlockedAt).toLocaleDateString()}
            </p>
          </div>
        ))}

        {locked.map(a => (
          <div
            key={a.id}
            className="rounded-lg p-3 border text-center opacity-40"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-3xl mb-1 grayscale">&#128274;</div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>{a.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>???</p>
          </div>
        ))}
      </div>
    </div>
  );
}
