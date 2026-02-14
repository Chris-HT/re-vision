import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSelector from '../components/ProfileSelector';
import { ExportButton, ImportButton } from '../components/ImportExport';

export default function Home({ onSelectProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profilesResponse, healthResponse, subjectsResponse] = await Promise.all([
          fetch('/api/profiles'),
          fetch('/api/health'),
          fetch('/api/subjects')
        ]);

        const profilesData = await profilesResponse.json();
        setProfiles(profilesData.profiles);

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

  // Fetch stats when profile is selected
  useEffect(() => {
    if (selectedProfile) {
      fetch(`/api/progress/${selectedProfile.id}/stats`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(() => setStats(null));
    }
  }, [selectedProfile]);

  const handleSelectProfile = (profile) => {
    onSelectProfile(profile);
    setSelectedProfile(profile);
  };

  const handleSelectMode = (mode) => {
    if (selectedProfile) {
      const routes = {
        flashcards: '/flashcards',
        'dynamic-test': '/dynamic-test',
        'smart-review': '/smart-review'
      };
      navigate(routes[mode] || '/flashcards');
    }
  };

  const toggleFavourite = async (subjectId) => {
    if (!selectedProfile) return;
    const favs = selectedProfile.favourites || [];
    const newFavs = favs.includes(subjectId)
      ? favs.filter(f => f !== subjectId)
      : [...favs, subjectId];

    try {
      const res = await fetch(`/api/profiles/${selectedProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favourites: newFavs })
      });
      if (res.ok) {
        const updated = { ...selectedProfile, favourites: newFavs };
        setSelectedProfile(updated);
        onSelectProfile(updated);
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

  const favouriteSubjects = selectedProfile?.favourites?.length > 0
    ? subjects.filter(s => selectedProfile.favourites.includes(s.id))
    : [];

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
          {!selectedProfile ? (
            <>
              <h2 className="text-2xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
                Who's studying today?
              </h2>
              <ProfileSelector
                profiles={profiles}
                onSelectProfile={handleSelectProfile}
              />
            </>
          ) : (
            <>
              {/* Welcome back section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center space-x-3 rounded-lg px-6 py-3" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
                  <span className="text-3xl">{selectedProfile.icon}</span>
                  <div className="text-left">
                    <span className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                      Welcome back, {selectedProfile.name}!
                    </span>
                    <div className="flex items-center space-x-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {stats?.lastSessionDate && (
                        <span>Last session: {timeAgo(stats.lastSessionDate)}</span>
                      )}
                      {stats?.currentStreak > 0 && (
                        <span className="text-orange-400 font-medium">
                          {stats.currentStreak} day streak!
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
                  <button
                    onClick={() => {
                      setSelectedProfile(null);
                      onSelectProfile(null);
                      setStats(null);
                    }}
                    className="ml-4 text-sm hover:opacity-80"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Change
                  </button>
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
                          onSelectProfile({ ...selectedProfile, defaultSubjects: [subject.id] });
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>

              {/* Subject list with favourite stars */}
              {subjects.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Your Subjects
                    </h3>
                    <ImportButton onImported={() => {
                      fetch('/api/subjects').then(r => r.json()).then(d => setSubjects(d.subjects || []));
                    }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subjects.map(subject => {
                      const isFav = (selectedProfile.favourites || []).includes(subject.id);
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
                            <ExportButton subjectId={subject.id} subjectName={subject.name} />
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
            </>
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
