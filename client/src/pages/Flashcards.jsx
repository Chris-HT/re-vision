import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfigPanel from '../components/ConfigPanel';
import FlashcardDeck from '../components/FlashcardDeck';
import ResultsScreen from '../components/ResultsScreen';
import { useQuestions } from '../hooks/useQuestions';

export default function Flashcards({ profile }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [config, setConfig] = useState({});
  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  
  const { questions, categories, loading, error } = useQuestions(
    config.subject,
    config.theme
  );

  useEffect(() => {
    if (!profile) {
      navigate('/');
      return;
    }

    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/subjects');
        const data = await response.json();
        setSubjects(data.subjects);
        
        if (profile.defaultSubjects?.length > 0) {
          setConfig({ subject: profile.defaultSubjects[0] });
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      }
    };

    fetchSubjects();
  }, [profile, navigate]);

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

  if (showResults && sessionResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        <ResultsScreen
          results={sessionResults}
          categories={categories}
          onRestart={handleRestart}
          onReviewMissed={handleReviewMissed}
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
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Flashcard Study Mode</h1>
            <p className="text-slate-300">Configure your study session below</p>
          </div>

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