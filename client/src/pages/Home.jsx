import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSelector from '../components/ProfileSelector';

export default function Home({ onSelectProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [apiConfigured, setApiConfigured] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profilesResponse, healthResponse] = await Promise.all([
          fetch('/api/profiles'),
          fetch('/api/health')
        ]);
        
        const profilesData = await profilesResponse.json();
        setProfiles(profilesData.profiles);
        
        const healthData = await healthResponse.json();
        setApiConfigured(healthData.claudeApiConfigured);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectProfile = (profile) => {
    onSelectProfile(profile);
    setSelectedProfile(profile);
  };

  const handleSelectMode = (mode) => {
    if (selectedProfile) {
      navigate(mode === 'flashcards' ? '/flashcards' : '/dynamic-test');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center space-x-4 mb-6">
            <span className="text-6xl">🧠</span>
            <h1 className="text-5xl font-bold text-white">RE-VISION</h1>
          </div>
          <p className="text-xl text-slate-300">
            Flashcard and dynamic test platform for the whole family
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {!selectedProfile ? (
            <>
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                Who's studying today?
              </h2>
              <ProfileSelector 
                profiles={profiles} 
                onSelectProfile={handleSelectProfile}
              />
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center space-x-3 bg-slate-800 rounded-lg px-6 py-3">
                  <span className="text-3xl">{selectedProfile.icon}</span>
                  <span className="text-xl text-white font-medium">{selectedProfile.name}</span>
                  <button
                    onClick={() => {
                      setSelectedProfile(null);
                      onSelectProfile(null);
                    }}
                    className="ml-4 text-sm text-slate-400 hover:text-white"
                  >
                    Change
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                Choose your study mode
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => handleSelectMode('flashcards')}
                  className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-slate-700"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <span className="text-5xl group-hover:scale-110 transition-transform">📚</span>
                    <h3 className="text-xl font-bold text-white">Flashcards</h3>
                    <p className="text-sm text-slate-300 text-center">
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
                      ? 'bg-slate-800 hover:bg-slate-700 hover:scale-105 hover:shadow-xl border-slate-700'
                      : 'bg-slate-900 opacity-50 cursor-not-allowed border-slate-800'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <span className={`text-5xl ${apiConfigured ? 'group-hover:scale-110' : ''} transition-transform`}>
                      🤖
                    </span>
                    <h3 className="text-xl font-bold text-white">Dynamic Test</h3>
                    <p className="text-sm text-slate-300 text-center">
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
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-16 text-slate-400">
          <p className="mb-2">Study smarter, not harder</p>
          <div className="flex justify-center space-x-6 text-sm">
            <span>📚 Flashcards</span>
            <span>🤖 AI-Powered Tests</span>
            <span>📊 Progress Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}