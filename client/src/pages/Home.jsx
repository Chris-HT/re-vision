import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportButton, ImportButton } from '../components/ImportExport';
import { apiFetch } from '../utils/api';

export default function Home({ profile, setProfile }) {
  const [apiConfigured, setApiConfigured] = useState(false);
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthResponse, subjectsResponse] = await Promise.all([
          fetch('/api/health'),
          apiFetch('/api/subjects')
        ]);

        const healthData = await healthResponse.json();
        setApiConfigured(healthData.claudeApiConfigured);

        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData.subjects || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    apiFetch(`/api/progress/${profile.id}/stats`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch((err) => { if (err.name !== 'AbortError') setStats(null); });
    return () => controller.abort();
  }, [profile]);

  const handleSelectMode = (mode) => {
    const routes = {
      flashcards: '/flashcards',
      'dynamic-test': '/dynamic-test',
      'smart-review': '/smart-review',
      dashboard: '/dashboard',
      family: '/family'
    };
    navigate(routes[mode] || '/flashcards');
  };

  const toggleFavourite = async (subjectId) => {
    if (!profile) return;
    const favs = profile.favourites || [];
    const newFavs = favs.includes(subjectId)
      ? favs.filter(f => f !== subjectId)
      : [...favs, subjectId];

    try {
      const res = await apiFetch(`/api/profiles/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ favourites: newFavs })
      });
      if (res.ok) {
        const updated = { ...profile, favourites: newFavs };
        setProfile(updated);
      }
    } catch (err) {
      console.error('Failed to update favourites:', err);
    }
  };

  function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: 'var(--text-primary)' }} className="text-xl">Loading...</div>
      </div>
    );
  }

  const favouriteSubjects = profile?.favourites?.length > 0
    ? subjects.filter(s => profile.favourites.includes(s.id))
    : [];

  const isParentOrAdmin = profile?.role === 'admin' || profile?.role === 'parent';

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center space-x-4 mb-6">
            <span className="text-6xl">&#129504;</span>
            <h1 className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>RE-VISION</h1>
          </div>
          <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
            Flashcard and dynamic test platform for the whole family
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Welcome back section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 rounded-lg px-6 py-3" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
              <span className="text-3xl">{profile.icon}</span>
              <div className="text-left">
                <span className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                  Hello, {profile.name}
                </span>
                <div className="flex items-center space-x-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {stats?.lastSessionDate && (
                    <span>Last session: {timeAgo(stats.lastSessionDate)}</span>
                  )}
                  {stats?.currentStreak > 0 && (
                    <span className="text-orange-400 font-medium">
                      {stats.currentStreak} days in a row
                    </span>
                  )}
                  {stats?.dueToday > 0 && (
                    <button
                      onClick={() => navigate('/smart-review')}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {stats.dueToday} cards due
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Favourite subjects quick-launch */}
          {favouriteSubjects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Quick Launch</h3>
              <div className="flex flex-wrap gap-3">
                {favouriteSubjects.map(subject => (
                  <button
                    key={subject.id}
                    onClick={() => {
                      setProfile({ ...profile, defaultSubjects: [subject.id] });
                      navigate('/flashcards');
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'var(--bg-card-solid)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span>{subject.icon}</span>
                    <span className="text-sm font-medium">{subject.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
            Choose your study mode
          </h2>

          <div className={`grid grid-cols-1 ${isParentOrAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
            <button
              onClick={() => handleSelectMode('flashcards')}
              className="group relative overflow-hidden rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border"
              style={{
                backgroundColor: 'var(--bg-card-solid)',
                borderColor: 'var(--border-color)'
              }}
            >
              <div className="flex flex-col items-center space-y-4">
                <span className="text-5xl group-hover:scale-110 transition-transform">&#128218;</span>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Flashcards</h3>
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  Study with flip cards and self-assessment
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>

            <button
              onClick={() => handleSelectMode('dynamic-test')}
              disabled={!apiConfigured}
              className={`group relative overflow-hidden rounded-xl p-8 transition-all duration-300 transform border ${
                apiConfigured
                  ? 'hover:scale-105 hover:shadow-xl'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: 'var(--bg-card-solid)',
                borderColor: 'var(--border-color)'
              }}
            >
              <div className="flex flex-col items-center space-y-4">
                <span className={`text-5xl ${apiConfigured ? 'group-hover:scale-110' : ''} transition-transform`}>
                  &#129302;
                </span>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dynamic Test</h3>
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  {apiConfigured
                    ? 'AI-generated tests on any topic'
                    : 'API key required'}
                </p>
              </div>
              {apiConfigured && (
                <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              )}
              {!apiConfigured && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded">Setup Required</span>
                </div>
              )}
            </button>

            <button
              onClick={() => handleSelectMode('smart-review')}
              className="group relative overflow-hidden rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border"
              style={{
                backgroundColor: 'var(--bg-card-solid)',
                borderColor: 'var(--border-color)'
              }}
            >
              <div className="flex flex-col items-center space-y-4">
                <span className="text-5xl group-hover:scale-110 transition-transform">&#129504;</span>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Smart Review</h3>
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  AI-powered spaced repetition
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>

            {isParentOrAdmin && (
              <button
                onClick={() => handleSelectMode('family')}
                className="group relative overflow-hidden rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex flex-col items-center space-y-4">
                  <span className="text-5xl group-hover:scale-110 transition-transform">&#128106;</span>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Family</h3>
                  <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                    View children's progress
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            )}
          </div>

          {/* Subject list with favourite stars */}
          {subjects.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Your Subjects
                </h3>
                {isParentOrAdmin && (
                  <ImportButton onImported={() => {
                    apiFetch('/api/subjects').then(r => r.json()).then(d => setSubjects(d.subjects || []));
                  }} />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subjects.map(subject => {
                  const isFav = (profile.favourites || []).includes(subject.id);
                  return (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{subject.icon}</span>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{subject.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subject.themes?.length || 0} themes</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isParentOrAdmin && <ExportButton subjectId={subject.id} subjectName={subject.name} />}
                        <button
                          onClick={() => toggleFavourite(subject.id)}
                          className={`text-xl transition-transform hover:scale-110 ${isFav ? '' : 'opacity-30 hover:opacity-60'}`}
                        >
                          {isFav ? '\u2605' : '\u2606'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-16" style={{ color: 'var(--text-muted)' }}>
          <p className="mb-2">Study smarter, not harder</p>
          <div className="flex justify-center space-x-6 text-sm">
            <span>&#128218; Flashcards</span>
            <span>&#129302; AI-Powered Tests</span>
            <span>&#128200; Progress Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
