import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfigPanel from '../components/ConfigPanel';
import FlashcardDeck from '../components/FlashcardDeck';
import ResultsScreen from '../components/ResultsScreen';
import FlashcardGenerationWizard from '../components/FlashcardGenerationWizard';
import { useQuestions } from '../hooks/useQuestions';

export default function Flashcards({ profile }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [config, setConfig] = useState({});
  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const [timerMode, setTimerMode] = useState('off');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [showGenerationWizard, setShowGenerationWizard] = useState(false);

  const { questions, categories, loading, error } = useQuestions(
    config.subject,
    config.theme
  );

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data.subjects);
      return data.subjects;
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  useEffect(() => {
    if (!profile) {
      navigate('/');
      return;
    }

    fetchSubjects().then(subs => {
      if (subs && profile.defaultSubjects?.length > 0) {
        setConfig({ subject: profile.defaultSubjects[0] });
      }
    });
  }, [profile, navigate]);

  const handleWizardComplete = async (subjectId, themeId) => {
    setShowGenerationWizard(false);
    await fetchSubjects();
    setConfig({ subject: subjectId, theme: themeId });
  };

  const handleStartSession = () => {
    let filtered = [...questions];

    if (config.categories?.length > 0) {
      filtered = filtered.filter(q => config.categories.includes(q.category));
    }

    if (config.difficulty && config.difficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === parseInt(config.difficulty));
    }

    const shuffled = filtered.sort(() => Math.random() - 0.5);

    setSessionQuestions(shuffled);
    setShowResults(false);
  };

  const handleComplete = (results) => {
    setSessionResults(results);
    setShowResults(true);
    setSessionQuestions(null);
  };

  const handleRestart = () => {
    setSessionQuestions(null);
    setShowResults(false);
    setSessionResults(null);
  };

  const handleReviewMissed = (missedCards) => {
    setSessionQuestions(missedCards);
    setShowResults(false);
  };

  const getTimerSecondsForSession = () => {
    if (timerMode === 'off') return 0;
    if (timerMode === 'per-question') return timerSeconds;
    if (timerMode === 'whole-test') {
      const count = questions?.length || 10;
      return timerSeconds * count;
    }
    return 0;
  };

  if (showResults && sessionResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        <ResultsScreen
          results={sessionResults}
          categories={categories}
          onRestart={handleRestart}
          onReviewMissed={handleReviewMissed}
          profile={profile}
        />
      </div>
    );
  }

  if (sessionQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        <FlashcardDeck
          questions={sessionQuestions}
          categories={categories}
          onComplete={handleComplete}
          profileId={profile?.id}
          trackProgress={true}
          timerMode={timerMode}
          timerSeconds={getTimerSecondsForSession()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Flashcard Study Mode</h1>
              <p className="text-slate-300">Configure your study session below</p>
            </div>
            <button
              onClick={() => setShowGenerationWizard(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all text-sm flex items-center gap-2 shrink-0"
            >
              <span>+</span> Add Subject
            </button>
          </div>

          {showGenerationWizard && (
            <FlashcardGenerationWizard
              profile={profile}
              subjects={subjects}
              onComplete={handleWizardComplete}
              onClose={() => setShowGenerationWizard(false)}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ConfigPanel
                subjects={subjects}
                categories={categories}
                onConfigChange={setConfig}
                initialConfig={config}
              />
            </div>

            <div>
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>

                {loading && (
                  <p className="text-slate-400">Loading questions...</p>
                )}

                {error && (
                  <p className="text-red-400">Error: {error}</p>
                )}

                {!loading && !error && questions && (
                  <>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Questions:</span>
                        <span className="text-white font-medium">{questions.length}</span>
                      </div>
                      {config.categories?.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Filtered:</span>
                          <span className="text-white font-medium">
                            {questions.filter(q => config.categories.includes(q.category)).length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timer Configuration */}
                    <div className="mb-6 border-t border-slate-700 pt-4">
                      <h4 className="text-sm font-medium text-white mb-3">Exam Timer</h4>
                      <div className="space-y-2">
                        <select
                          value={timerMode}
                          onChange={(e) => setTimerMode(e.target.value)}
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="off">Off</option>
                          <option value="per-question">Per Question</option>
                          <option value="whole-test">Whole Test</option>
                        </select>
                        {timerMode !== 'off' && (
                          <select
                            value={timerSeconds}
                            onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
                            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                          >
                            <option value={30}>30 seconds</option>
                            <option value={60}>60 seconds</option>
                            <option value={90}>90 seconds</option>
                            <option value={120}>2 minutes</option>
                          </select>
                        )}
                        {timerMode === 'whole-test' && (
                          <p className="text-xs text-slate-400">
                            Total: {Math.round((timerSeconds * (questions?.length || 0)) / 60)} min for {questions?.length || 0} questions
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleStartSession}
                      disabled={!questions.length || (config.categories?.length > 0 && !questions.filter(q => config.categories.includes(q.category)).length)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all"
                    >
                      Start Session
                    </button>
                  </>
                )}
              </div>

              <div className="bg-slate-800 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Keyboard Shortcuts</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flip card:</span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded text-white">Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Got it:</span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded text-white">1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Missed:</span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded text-white">2</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Skip:</span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded text-white">3</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
