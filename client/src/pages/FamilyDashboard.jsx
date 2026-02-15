import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function FamilyDashboard({ profile }) {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [childStats, setChildStats] = useState({});
  const [childReports, setChildReports] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'parent')) {
      navigate('/');
      return;
    }

    const controller = new AbortController();
    const fetchFamily = async () => {
      try {
        const res = await apiFetch('/api/auth/children', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch children');
        const data = await res.json();
        setChildren(data.children || []);

        // Fetch stats and recent reports for each child
        const statsPromises = {};
        const reportsPromises = {};
        for (const child of data.children || []) {
          statsPromises[child.id] = apiFetch(`/api/progress/${child.id}/stats`, { signal: controller.signal })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
          reportsPromises[child.id] = apiFetch(`/api/reports/${child.id}?limit=3`, { signal: controller.signal })
            .then(r => r.ok ? r.json() : { reports: [] })
            .catch(() => ({ reports: [] }));
        }

        const statsResults = {};
        const reportsResults = {};
        for (const child of data.children || []) {
          statsResults[child.id] = await statsPromises[child.id];
          reportsResults[child.id] = await reportsPromises[child.id];
        }
        setChildStats(statsResults);
        setChildReports(reportsResults);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load family data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFamily();
    return () => controller.abort();
  }, [profile, navigate]);

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: 'var(--text-primary)' }} className="text-xl">Loading family data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Family Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Monitor your children's learning progress</p>
          </div>

          {children.length === 0 ? (
            <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No linked children found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {children.map(child => {
                const stats = childStats[child.id];
                const reports = childReports[child.id]?.reports || [];

                return (
                  <div
                    key={child.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
                  >
                    {/* Child header */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="text-4xl">{child.icon}</span>
                          <div>
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{child.name}</h2>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {child.ageGroup === 'primary' ? 'Primary' : child.ageGroup === 'secondary' ? 'Secondary' : 'Adult'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/dashboard', { state: { viewProfileId: child.id } })}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          View Dashboard
                        </button>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="text-2xl font-bold text-blue-400">{stats?.totalCardsStudied || 0}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Cards Studied</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="text-2xl font-bold text-orange-400">{stats?.currentStreak || 0}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Day Streak</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="text-2xl font-bold text-green-400">{stats?.totalSessions || 0}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Sessions</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {timeAgo(stats?.lastSessionDate)}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Last Active</div>
                        </div>
                      </div>
                    </div>

                    {/* Recent test reports */}
                    {reports.length > 0 && (
                      <div className="border-t px-6 pb-6 pt-4" style={{ borderColor: 'var(--border-color)' }}>
                        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Recent Tests</h3>
                        <div className="space-y-2">
                          {reports.map(r => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between rounded-lg p-3"
                              style={{ backgroundColor: 'var(--bg-secondary)' }}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                                  r.score >= 70 ? 'bg-green-600' : r.score >= 40 ? 'bg-amber-600' : 'bg-red-600'
                                }`}>
                                  {r.score}%
                                </span>
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.topic}</p>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {r.questionCount} questions &middot; {r.difficulty}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {new Date(r.generatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
