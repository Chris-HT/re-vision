import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import UserManagementPanel from '../components/UserManagementPanel';

export default function FamilyDashboard({ profile }) {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [childStats, setChildStats] = useState({});
  const [childReports, setChildReports] = useState({});
  const [childTokens, setChildTokens] = useState({});
  const [tokenHistory, setTokenHistory] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});
  const [editingRate, setEditingRate] = useState({});
  const [rateInputs, setRateInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUserMgmt, setShowUserMgmt] = useState(false);

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

        // Fetch token summaries
        const tokenRes = await apiFetch('/api/tokens/children/summary', { signal: controller.signal })
          .then(r => r.ok ? r.json() : { summaries: [] })
          .catch(() => ({ summaries: [] }));
        const tokenMap = {};
        for (const s of tokenRes.summaries || []) {
          tokenMap[s.profileId] = s;
        }

        const statsResults = {};
        const reportsResults = {};
        for (const child of data.children || []) {
          statsResults[child.id] = await statsPromises[child.id];
          reportsResults[child.id] = await reportsPromises[child.id];
        }
        setChildStats(statsResults);
        setChildReports(reportsResults);
        setChildTokens(tokenMap);
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Family Dashboard</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Monitor your children's learning progress</p>
            </div>
            {profile.role === 'admin' && (
              <button
                onClick={() => setShowUserMgmt(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Users
              </button>
            )}
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
                const tokenData = childTokens[child.id] || { tokens: 0, tokenRate: 0.10, dailyEarned: 0, dailyRemaining: 10, monetaryValue: 0 };

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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                        <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="text-2xl font-bold text-emerald-400">💷 {tokenData.tokens}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            = £{tokenData.monetaryValue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Token management */}
                    <div className="border-t px-6 pb-4 pt-4" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Token Settings</h3>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Today: {tokenData.dailyEarned}/{tokenData.dailyEarned + tokenData.dailyRemaining} tokens earned
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Rate: £</span>
                        {editingRate[child.id] ? (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              value={rateInputs[child.id] ?? tokenData.tokenRate}
                              onChange={e => setRateInputs(prev => ({ ...prev, [child.id]: e.target.value }))}
                              className="w-20 px-2 py-1 rounded text-sm"
                              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>per token</span>
                            <button
                              onClick={async () => {
                                const rate = parseFloat(rateInputs[child.id]);
                                if (isNaN(rate) || rate < 0 || rate > 10) return;
                                try {
                                  await apiFetch(`/api/tokens/${child.id}/rate`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ rate })
                                  });
                                  setChildTokens(prev => ({
                                    ...prev,
                                    [child.id]: { ...prev[child.id], tokenRate: rate, monetaryValue: parseFloat((prev[child.id].tokens * rate).toFixed(2)) }
                                  }));
                                } catch { /* ignore */ }
                                setEditingRate(prev => ({ ...prev, [child.id]: false }));
                              }}
                              className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRate(prev => ({ ...prev, [child.id]: false }))}
                              className="px-2 py-1 text-xs rounded transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {tokenData.tokenRate.toFixed(2)} per token
                            </span>
                            <button
                              onClick={() => {
                                setRateInputs(prev => ({ ...prev, [child.id]: tokenData.tokenRate.toFixed(2) }));
                                setEditingRate(prev => ({ ...prev, [child.id]: true }));
                              }}
                              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                            >
                              Change
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          if (expandedHistory[child.id]) {
                            setExpandedHistory(prev => ({ ...prev, [child.id]: false }));
                            return;
                          }
                          try {
                            const res = await apiFetch(`/api/tokens/${child.id}/transactions?limit=10`);
                            if (res.ok) {
                              const data = await res.json();
                              setTokenHistory(prev => ({ ...prev, [child.id]: data.transactions }));
                            }
                          } catch { /* ignore */ }
                          setExpandedHistory(prev => ({ ...prev, [child.id]: true }));
                        }}
                        className="mt-3 text-xs underline"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {expandedHistory[child.id] ? 'Hide token history' : 'Show token history'}
                      </button>
                      {expandedHistory[child.id] && tokenHistory[child.id] && (
                        <div className="mt-2 space-y-1">
                          {tokenHistory[child.id].length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No token transactions yet.</p>
                          ) : (
                            tokenHistory[child.id].map(tx => (
                              <div key={tx.id} className="flex items-center justify-between rounded p-2 text-xs"
                                style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <div>
                                  <span className="font-bold text-emerald-400">+{tx.amount}</span>
                                  <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>{tx.reason}</span>
                                </div>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  {new Date(tx.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
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
        {showUserMgmt && (
          <UserManagementPanel
            currentProfileId={profile.id}
            onClose={() => setShowUserMgmt(false)}
          />
        )}
      </div>
    </div>
  );
}
