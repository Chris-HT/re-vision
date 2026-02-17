import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import ConfigPanel from '../components/ConfigPanel';
import FlashcardDeck from '../components/FlashcardDeck';
import ResultsScreen from '../components/ResultsScreen';
import FlashcardGenerationWizard from '../components/FlashcardGenerationWizard';
import { useQuestions } from '../hooks/useQuestions';
import { useStudyTimer } from '../context/StudyTimerContext';
import SessionPreview from '../components/SessionPreview';
import StepIndicator from '../components/StepIndicator';

export default function Flashcards({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const studyTimer = useStudyTimer();
  const [subjects, setSubjects] = useState([]);
  const [config, setConfig] = useState({});
  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const [timerMode, setTimerMode] = useState('off');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [showGenerationWizard, setShowGenerationWizard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState(null);
  const [maxCards, setMaxCards] = useState(null);
  const [activePreset, setActivePreset] = useState(profile?.sessionPreset || 'standard');

  const sessionPresets = {
    primary: { quick: 5, standard: 8, extended: 12 },
    secondary: { quick: 8, standard: 10, extended: 15 },
    adult: { quick: 10, standard: 15, extended: 20 }
  };
  const presets = sessionPresets[profile?.ageGroup || 'adult'] || sessionPresets.adult;

  const practiceCardIds = location.state?.practiceCardIds;

  // Start/stop study timer based on session state
  useEffect(() => {
    if (sessionQuestions && !showResults && studyTimer) {
      studyTimer.startStudying();
    } else if (studyTimer) {
      studyTimer.stopStudying();
    }
    return () => { if (studyTimer) studyTimer.stopStudying(); };
  }, [!!sessionQuestions, showResults]);

  const { questions, categories, loading, error } = useQuestions(
    config.subject,
    config.theme
  );

  // When practice card IDs arrive from Dashboard, start a session once questions load
  useEffect(() => {
    if (practiceCardIds && questions?.length > 0 && !sessionQuestions) {
      const idSet = new Set(practiceCardIds);
      const filtered = questions.filter(q => idSet.has(q.id));
      if (filtered.length > 0) {
        setSessionQuestions(filtered);
        window.history.replaceState({}, document.title);
      }
    }
  }, [practiceCardIds, questions, sessionQuestions]);

  const fetchSubjects = async () => {
    try {
      const response = await apiFetch('/api/subjects');
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

    // Handle incoming review/practice cards from navigation state
    if (location.state?.reviewCards) {
      setSessionQuestions(location.state.reviewCards);
      // Clear state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
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
    const limited = maxCards ? shuffled.slice(0, maxCards) : shuffled;

    setPendingQuestions(limited);
    setShowPreview(true);
  };

  const handleConfirmStart = () => {
    setSessionQuestions(pendingQuestions);
    setPendingQuestions(null);
    setShowPreview(false);
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

  const flashcardSteps = ['Select', 'Preview', 'Study', 'Results'];

  if (showResults && sessionResults) {
    return (
      <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
        <div className="max-w-4xl mx-auto px-4 mb-2">
          <StepIndicator steps={flashcardSteps} currentStep={3} />
        </div>
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

  if (showPreview && pendingQuestions) {
    const subjectName = subjects.find(s => s.id === config.subject)?.name || 'selected topic';
    return (
      <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-2">
            <StepIndicator steps={flashcardSteps} currentStep={1} />
          </div>
          <SessionPreview
            questionCount={pendingQuestions.length}
            format="flashcard"
            topic={subjectName}
            estimatedMinutes={Math.round(pendingQuestions.length * 0.5)}
            nextStep="After this: You'll see your results with correct, missed, and skipped cards"
            onStart={handleConfirmStart}
            onBack={() => { setShowPreview(false); setPendingQuestions(null); }}
          />
        </div>
      </div>
    );
  }

  if (sessionQuestions) {
    return (
      <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
        <div className="max-w-4xl mx-auto px-4 mb-2">
          <StepIndicator steps={flashcardSteps} currentStep={2} />
        </div>
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
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Flashcard Study Mode</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Configure your study session below</p>
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
              <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Session Info</h3>

                {loading && (
                  <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
                )}

                {error && (
                  <p className="text-red-400">Error: {error}</p>
                )}

                {!loading && !error && questions && (
                  <>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Total Questions:</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{questions.length}</span>
                      </div>
                      {config.categories?.length > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-secondary)' }}>Filtered:</span>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {questions.filter(q => config.categories.includes(q.category)).length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Session Size Presets */}
                    <div className="mb-6 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Session Size</h4>
                      <div className="flex gap-2">
                        {Object.entries(presets).map(([key, count]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setActivePreset(key);
                              setMaxCards(count);
                            }}
                            className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                              activePreset === key ? 'bg-blue-600 text-white' : ''
                            }`}
                            style={activePreset !== key ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' } : undefined}
                          >
                            <span className="capitalize block">{key}</span>
                            <span className="opacity-75">{count} cards</span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setActivePreset(null);
                            setMaxCards(null);
                          }}
                          className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                            activePreset === null ? 'bg-blue-600 text-white' : ''
                          }`}
                          style={activePreset !== null ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' } : undefined}
                        >
                          <span className="block">All</span>
                          <span className="opacity-75">{questions.length}</span>
                        </button>
                      </div>
                      {maxCards && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                          ~{Math.round(maxCards * 0.5)} min session
                        </p>
                      )}
                    </div>

                    {/* Timer Configuration */}
                    <div className="mb-6 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Exam Timer</h4>
                      <div className="space-y-2">
                        <select
                          value={timerMode}
                          onChange={(e) => setTimerMode(e.target.value)}
                          className="w-full rounded-lg px-3 py-2 text-sm"
                          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                        >
                          <option value="off">Off</option>
                          <option value="per-question">Per Question</option>
                          <option value="whole-test">Whole Test</option>
                        </select>
                        {timerMode !== 'off' && (
                          <select
                            value={timerSeconds}
                            onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
                            className="w-full rounded-lg px-3 py-2 text-sm"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                          >
                            <option value={30}>30 seconds</option>
                            <option value={60}>60 seconds</option>
                            <option value={90}>90 seconds</option>
                            <option value={120}>2 minutes</option>
                          </select>
                        )}
                        {timerMode === 'whole-test' && (
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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

              <div className="rounded-lg p-6 mt-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
                <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Flip card:</span>
                    <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Got it:</span>
                    <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Missed:</span>
                    <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>2</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Skip:</span>
                    <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>3</kbd>
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
