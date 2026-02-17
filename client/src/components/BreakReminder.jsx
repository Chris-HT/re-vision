import { useState, useEffect, useRef } from 'react';
import { useStudyTimer } from '../context/StudyTimerContext';

export default function BreakReminder() {
  const timer = useStudyTimer();
  const [takingBreak, setTakingBreak] = useState(false);
  const [breakCountdown, setBreakCountdown] = useState(180); // 3 minutes
  const countdownRef = useRef(null);

  useEffect(() => {
    if (takingBreak && breakCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setBreakCountdown(c => c - 1);
      }, 1000);
    } else {
      clearInterval(countdownRef.current);
    }
    return () => clearInterval(countdownRef.current);
  }, [takingBreak, breakCountdown]);

  if (!timer || (!timer.breakDue && !takingBreak)) return null;

  const totalMinutes = Math.floor(timer.studySeconds / 60);
  const isLongSession = totalMinutes >= 45;

  const handleTakeBreak = () => {
    setTakingBreak(true);
    setBreakCountdown(180);
    timer.acknowledgeBreak();
  };

  const handleKeepGoing = () => {
    timer.dismissBreak();
  };

  const handleBackFromBreak = () => {
    setTakingBreak(false);
    setBreakCountdown(180);
    timer.resumeFromBreak();
  };

  if (takingBreak) {
    const mins = Math.floor(breakCountdown / 60);
    const secs = breakCountdown % 60;

    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 rounded-lg shadow-lg border px-6 py-4 max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
      >
        <div className="text-center">
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Break time — relax for a moment
          </p>
          {breakCountdown > 0 ? (
            <p className="text-2xl font-mono font-bold text-blue-400 mb-3">
              {mins}:{String(secs).padStart(2, '0')}
            </p>
          ) : (
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Break timer finished
            </p>
          )}
          <button
            onClick={handleBackFromBreak}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            I'm back!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 rounded-lg shadow-lg border px-6 py-4 max-w-md w-full mx-4"
      style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
    >
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        {isLongSession
          ? `You've been studying for ${totalMinutes} minutes. Consider taking a longer break.`
          : `You've been studying for ${totalMinutes} minutes. Take a short break?`}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleTakeBreak}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Take a Break
        </button>
        <button
          onClick={handleKeepGoing}
          className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
        >
          Keep Going
        </button>
      </div>
    </div>
  );
}
