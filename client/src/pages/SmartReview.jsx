import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useProgress } from '../hooks/useProgress';
import FlashcardDeck from '../components/FlashcardDeck';

export default function SmartReview({ profile }) {
  const navigate = useNavigate();
  const { stats, dueInfo, loading, fetchDue, recordAnswer } = useProgress(profile?.id);
  const [allQuestions, setAllQuestions] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [categories, setCategories] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [studyMode, setStudyMode] = useState(null); // 'due' | 'unseen' | 'extra'

  useEffect(() => {
    if (!profile) {
      navigate('/');
      return;
    }
    loadQuestions();
  }, [profile, navigate]);

  useEffect(() => {
    if (profile) {
      fetchDue();
    }
  }, [profile, fetchDue]);

  const loadQuestions = async () => {
    try {
      const subjectsRes = await apiFetch('/api/subjects');
      const subjectsData = await subjectsRes.json();

      let questions = [];
      let cats = {};
      for (const subject of subjectsData.subjects) {
        const questionsRes = await apiFetch(`/api/subjects/${subject.id}/questions`);
        const questionsData = await questionsRes.json();
        questions = questions.concat(questionsData.questions);
        cats = { ...cats, ...questionsData.categories };
      }
      setAllQuestions(questions);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const startDueReview = useCallback(() => {
    if (!dueInfo || !allQuestions.length) return;

    const dueIds = [...dueInfo.dueCards, ...dueInfo.unseenCards];
    if (dueIds.length === 0) {
      setAllCaughtUp(true);
      return;
    }

    const questionMap = new Map(allQuestions.map(q => [q.id, q]));
    const cards = dueIds
      .map(id => questionMap.get(id))
      .filter(Boolean);

    if (cards.length === 0) {
      setAllCaughtUp(true);
      return;
    }

    setStudyMode('due');
    setSessionQuestions(cards);
    setShowResults(false);
    setAllCaughtUp(false);
  }, [dueInfo, allQuestions]);

  const startUnseenOnly = useCallback(() => {
    if (!dueInfo || !allQuestions.length) return;

    const questionMap = new Map(allQuestions.map(q => [q.id, q]));
    const cards = dueInfo.unseenCards
      .map(id => questionMap.get(id))
      .filter(Boolean);

    if (cards.length === 0) return;

    setStudyMode('unseen');
    setSessionQuestions(cards);
    setShowResults(false);
    setAllCaughtUp(false);
  }, [dueInfo, allQuestions]);

  const startExtraPractice = useCallback(() => {
    // Shuffle all questions for extra practice
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 20);
    setStudyMode('extra');
    setSessionQuestions(shuffled);
    setShowResults(false);
    setAllCaughtUp(false);
  }, [allQuestions]);

  const handleComplete = (results) => {
    setSessionResults(results);
    setShowResults(true);
    setSessionQuestions(null);
  };

  const handleRestart = () => {
    setSessionQuestions(null);
    setShowResults(false);
    setSessionResults(null);
    setAllCaughtUp(false);
    fetchDue();
  };

  const handleReviewMissed = (missedCards) => {
    setSessionQuestions(missedCards);
    setShowResults(false);
  };

  if (!profile) return null;

  if (loading || !allQuestions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading Smart Review...</div>
      </div>
    );
  }

  // Show results
  if (showResults && sessionResults) {
    const total = sessionResults.correct.length + sessionResults.missed.length + sessionResults.skipped.length;
    const score = total > 0 ? Math.round((sessionResults.correct.length / total) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        <div className="max-w-4xl mx-auto p-6">
          {/* Mini stats bar */}
          <div className="bg-slate-800 rounded-lg p-4 mb-6 flex items-center justify-center space-x-6 text-sm">
            {stats?.currentStreak > 0 && (
              <span className="text-orange-400 font-medium">
                {stats.currentStreak} day streak
              </span>
            )}
            <span className="text-blue-400">{stats?.totalCardsStudied || 0} cards studied all-time</span>
          </div>

          <div className="bg-slate-800 rounded-xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-white mb-6">Smart Review Complete!</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-blue-400">{score}%</div>
                <div className="text-sm text-slate-400 mt-1">Score</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{sessionResults.correct.length}</div>
                <div className="text-sm text-slate-400 mt-1">Correct</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{sessionResults.missed.length}</div>
                <div className="text-sm text-slate-400 mt-1">Missed</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-slate-400">{sessionResults.skipped.length}</div>
                <div className="text-sm text-slate-400 mt-1">Skipped</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              Back to Smart Review
            </button>
            {sessionResults.missed.length > 0 && (
              <button
                onClick={() => handleReviewMissed(sessionResults.missed)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
              >
                Review Missed Cards
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active study session
  if (sessionQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        {/* Mini stats bar */}
        <div className="max-w-4xl mx-auto px-6 mb-4">
          <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-center space-x-6 text-sm">
            {stats?.currentStreak > 0 && (
              <span className="text-orange-400 font-medium">
                {stats.currentStreak} day streak
              </span>
            )}
            {dueInfo && (
              <>
                <span className="text-blue-400">{dueInfo.totalDue} cards due</span>
                <span className="text-green-400">{dueInfo.totalUnseen} new</span>
              </>
            )}
          </div>
        </div>
        <FlashcardDeck
          questions={sessionQuestions}
          categories={categories}
          onComplete={handleComplete}
          profileId={profile.id}
          trackProgress={true}
        />
      </div>
    );
  }

  // Landing / all caught up
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Smart Review</h1>
            <p className="text-slate-300">AI-powered spaced repetition</p>
          </div>

          {/* Stats bar */}
          <div className="bg-slate-800 rounded-lg p-4 mb-8 flex items-center justify-center space-x-6">
            {stats?.currentStreak > 0 && (
              <span className="text-orange-400 font-medium text-lg">
                {stats.currentStreak} day streak
              </span>
            )}
            {dueInfo && (
              <>
                <span className="text-blue-400">{dueInfo.totalDue} cards due</span>
                <span className="text-green-400">{dueInfo.totalUnseen} new cards</span>
              </>
            )}
            <span className="text-slate-400">{stats?.totalCardsStudied || 0} studied all-time</span>
          </div>

          {allCaughtUp ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center mb-6">
              <div className="text-5xl mb-4">&#127881;</div>
              <h2 className="text-2xl font-bold text-white mb-2">You're all caught up!</h2>
              <p className="text-slate-300 mb-6">Come back tomorrow for more review cards.</p>

              <div className="flex justify-center space-x-4">
                {dueInfo?.totalUnseen > 0 && (
                  <button
                    onClick={startUnseenOnly}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Study {dueInfo.totalUnseen} New Cards
                  </button>
                )}
                <button
                  onClick={startExtraPractice}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                >
                  Extra Practice
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {dueInfo && dueInfo.totalDue > 0 && (
                <button
                  onClick={startDueReview}
                  className="w-full group relative overflow-hidden bg-slate-800 hover:bg-slate-700 rounded-xl p-8 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-slate-700 text-left"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">&#129504;</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">Start Review</h3>
                      <p className="text-sm text-slate-300">
                        {dueInfo.totalDue} due cards + {dueInfo.totalUnseen} new cards ready
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
              )}

              {dueInfo && dueInfo.totalDue === 0 && dueInfo.totalUnseen > 0 && (
                <button
                  onClick={startUnseenOnly}
                  className="w-full group relative overflow-hidden bg-slate-800 hover:bg-slate-700 rounded-xl p-8 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-slate-700 text-left"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">&#127793;</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">Learn New Cards</h3>
                      <p className="text-sm text-slate-300">
                        {dueInfo.totalUnseen} unseen cards to study
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
              )}

              <button
                onClick={startExtraPractice}
                className="w-full group relative overflow-hidden bg-slate-800 hover:bg-slate-700 rounded-xl p-6 transition-all duration-300 border border-slate-700 text-left"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">&#128170;</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Extra Practice</h3>
                    <p className="text-sm text-slate-300">Random selection of 20 cards</p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
