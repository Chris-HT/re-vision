import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

const StudyTimerContext = createContext();

export function StudyTimerProvider({ children, breakInterval = 15 }) {
  const [studySeconds, setStudySeconds] = useState(0);
  const [isStudying, setIsStudying] = useState(false);
  const [breakDue, setBreakDue] = useState(false);
  const [breakDismissed, setBreakDismissed] = useState(false);
  const lastBreakAtRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isStudying) {
      intervalRef.current = setInterval(() => {
        setStudySeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isStudying]);

  // Check if break is due
  useEffect(() => {
    if (breakInterval <= 0 || !isStudying) return;
    const thresholdSeconds = breakInterval * 60;
    if (studySeconds - lastBreakAtRef.current >= thresholdSeconds) {
      setBreakDue(true);
      setBreakDismissed(false);
    }
  }, [studySeconds, breakInterval, isStudying]);

  const startStudying = useCallback(() => setIsStudying(true), []);
  const stopStudying = useCallback(() => setIsStudying(false), []);

  const acknowledgeBreak = useCallback(() => {
    setBreakDue(false);
    setBreakDismissed(false);
    lastBreakAtRef.current = studySeconds;
    setIsStudying(false);
  }, [studySeconds]);

  const dismissBreak = useCallback(() => {
    setBreakDue(false);
    setBreakDismissed(true);
    lastBreakAtRef.current = studySeconds;
  }, [studySeconds]);

  const resumeFromBreak = useCallback(() => {
    setIsStudying(true);
  }, []);

  const value = useMemo(() => ({
    studySeconds,
    isStudying,
    breakDue,
    breakDismissed,
    startStudying,
    stopStudying,
    acknowledgeBreak,
    dismissBreak,
    resumeFromBreak,
    breakInterval
  }), [studySeconds, isStudying, breakDue, breakDismissed, startStudying, stopStudying, acknowledgeBreak, dismissBreak, resumeFromBreak, breakInterval]);

  return (
    <StudyTimerContext.Provider value={value}>
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  return useContext(StudyTimerContext);
}
