import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import Timer from './Timer';
import { useTimer } from '../hooks/useTimer';

export default function FlashcardDeck({
  questions,
  categories,
  onComplete,
  profileId,
  trackProgress,
  timerMode,       // 'off' | 'per-question' | 'whole-test'
  timerSeconds      // seconds per question or total
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  // answers map: { [index]: { type: 'correct'|'missed'|'skipped', cardWithMeta: {...} } }
  const [answers, setAnswers] = useState({});
  const [questionStartTimes, setQuestionStartTimes] = useState([]);
  const sessionStartRef = useRef(Date.now());

  const currentCard = questions[currentIndex];
  const categoryInfo = categories[currentCard?.category];
  const totalAnswered = Object.keys(answers).length;
  const progress = (totalAnswered / questions.length) * 100;
  const hasAnswerForCurrent = answers[currentIndex] !== undefined;

  // Derive score counts from answers map
  const scores = useMemo(() => {
    const counts = { correct: 0, missed: 0, skipped: 0 };
    for (const entry of Object.values(answers)) {
      counts[entry.type]++;
    }
    return counts;
  }, [answers]);

  // Derive final results arrays from answers map
  const deriveFinalResults = useCallback(() => {
    const result = { correct: [], missed: [], skipped: [] };
    // Iterate in index order so results are ordered by card position
    const indices = Object.keys(answers).map(Number).sort((a, b) => a - b);
    for (const idx of indices) {
      const entry = answers[idx];
      result[entry.type].push(entry.cardWithMeta);
    }
    // Add any unanswered cards as skipped
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === undefined) {
        result.skipped.push({ ...questions[i], timedOut: true });
      }
    }
    return result;
  }, [answers, questions]);

  // Per-question timer
  const perQuestionTimer = useTimer(timerMode === 'per-question' ? timerSeconds : 0, {
    onExpire: () => {
      if (timerMode === 'per-question') handleAnswer('skipped', true);
    },
    autoStart: timerMode === 'per-question'
  });

  // Whole-test timer
  const wholeTestTimer = useTimer(timerMode === 'whole-test' ? timerSeconds : 0, {
    onExpire: () => {
      if (timerMode === 'whole-test') endSessionEarly();
    },
    autoStart: timerMode === 'whole-test'
  });

  // Track question start time
  useEffect(() => {
    setQuestionStartTimes(prev => {
      const copy = [...prev];
      copy[currentIndex] = Date.now();
      return copy;
    });
    if (timerMode === 'per-question' && timerSeconds) {
      perQuestionTimer.reset(timerSeconds);
      perQuestionTimer.start();
    }
  }, [currentIndex]);

  const endSessionEarly = useCallback(() => {
    const finalResults = deriveFinalResults();
    onComplete({
      ...finalResults,
      timerMode,
      totalTimeMs: Date.now() - sessionStartRef.current,
      questionTimes: questionStartTimes
    });
  }, [deriveFinalResults, onComplete, timerMode, questionStartTimes]);

  const handleAnswer = (type, timedOut = false) => {
    const timeSpentMs = questionStartTimes[currentIndex]
      ? Date.now() - questionStartTimes[currentIndex]
      : 0;

    const cardWithMeta = timedOut
      ? { ...currentCard, timedOut: true, timeSpentMs }
      : { ...currentCard, timeSpentMs };

    const newAnswers = { ...answers, [currentIndex]: { type, cardWithMeta } };
    setAnswers(newAnswers);

    // Record progress if tracking is enabled
    if (trackProgress && profileId && currentCard.id) {
      const progressResult = type === 'correct' ? 'correct' : type === 'missed' ? 'incorrect' : 'skipped';
      apiFetch(`/api/progress/${profileId}/card/${currentCard.id}`, {
        method: 'PUT',
        body: JSON.stringify({ result: progressResult })
      }).catch(err => console.error('Failed to record progress:', err));
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // All cards answered or at the end - derive results and complete
      const finalResults = { correct: [], missed: [], skipped: [] };
      const indices = Object.keys(newAnswers).map(Number).sort((a, b) => a - b);
      for (const idx of indices) {
        const entry = newAnswers[idx];
        finalResults[entry.type].push(entry.cardWithMeta);
      }
      for (let i = 0; i < questions.length; i++) {
        if (newAnswers[i] === undefined) {
          finalResults.skipped.push({ ...questions[i], timedOut: true });
        }
      }
      onComplete({
        ...finalResults,
        timerMode: timerMode || 'off',
        totalTimeMs: Date.now() - sessionStartRef.current,
        questionTimes: questionStartTimes
      });
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const goForward = () => {
    if (hasAnswerForCurrent && currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(f => !f);
      } else if (e.key === '1') {
        handleAnswer('correct');
      } else if (e.key === '2') {
        handleAnswer('missed');
      } else if (e.key === '3') {
        handleAnswer('skipped');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, currentIndex, answers]);

  if (!currentCard) return null;

  const activeTimer = timerMode === 'per-question' ? perQuestionTimer : timerMode === 'whole-test' ? wholeTestTimer : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">
            Card {currentIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center space-x-4">
            {activeTimer && (
              <Timer
                secondsLeft={activeTimer.secondsLeft}
                percentRemaining={activeTimer.percentRemaining}
              />
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo?.bgClass} text-white`}>
              {currentCard.category}
            </span>
            <span className="text-sm text-slate-400">
              Difficulty: {Array(currentCard.difficulty || 1).fill('').join('')}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Live score counter */}
        {totalAnswered > 0 && (
          <div className="flex items-center space-x-4 mt-2">
            <span className="flex items-center space-x-1 text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-green-400 font-medium">{scores.correct}</span>
            </span>
            <span className="flex items-center space-x-1 text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-red-400 font-medium">{scores.missed}</span>
            </span>
            <span className="flex items-center space-x-1 text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-slate-500"></span>
              <span className="text-slate-400 font-medium">{scores.skipped}</span>
            </span>
          </div>
        )}
      </div>

      <div className="perspective-1000">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full h-96 transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          <div className="absolute inset-0 backface-hidden">
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-8 flex flex-col justify-center items-center text-center border border-slate-600 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Question</h3>
              <p className="text-lg text-slate-200">{currentCard.question}</p>
              <div className="absolute bottom-6 text-sm text-slate-400">
                Press SPACE or click to flip
              </div>
            </div>
          </div>

          <div className="absolute inset-0 rotate-y-180 backface-hidden">
            <div className="w-full h-full bg-gradient-to-br from-purple-800 to-blue-800 rounded-xl p-8 flex flex-col justify-center items-center text-center border border-purple-600 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Answer</h3>
              <p className="text-lg text-white">{currentCard.answer}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center items-center space-x-4">
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentIndex === 0}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          title="Previous card (←)"
        >
          &#8592;
        </button>

        <button
          onClick={() => handleAnswer('correct')}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>&#10003;</span>
          <span>Got it (1)</span>
        </button>
        <button
          onClick={() => handleAnswer('missed')}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>&#10007;</span>
          <span>Missed (2)</span>
        </button>
        <button
          onClick={() => handleAnswer('skipped')}
          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>&#8594;</span>
          <span>Skip (3)</span>
        </button>

        {/* Forward button - only when current card already has an answer */}
        <button
          onClick={goForward}
          disabled={!hasAnswerForCurrent || currentIndex >= questions.length - 1}
          className={`px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors ${
            !hasAnswerForCurrent || currentIndex >= questions.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
          }`}
          title="Next card (→)"
        >
          &#8594;
        </button>
      </div>
    </div>
  );
}
