import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialSeconds, { onExpire, autoStart = false } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((newSeconds) => {
    setSecondsLeft(newSeconds ?? initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  const percentRemaining = initialSeconds > 0 ? (secondsLeft / initialSeconds) * 100 : 0;

  return {
    secondsLeft,
    isRunning,
    percentRemaining,
    start,
    pause,
    reset
  };
}
