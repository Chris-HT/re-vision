import { useState, useEffect, useCallback } from 'react';

export function useProgress(profileId) {
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [dueInfo, setDueInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`/api/progress/${profileId}`);
      if (res.ok) setProgress(await res.json());
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  }, [profileId]);

  const fetchStats = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`/api/progress/${profileId}/stats`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [profileId]);

  const fetchDue = useCallback(async (themes = null, limit = 30) => {
    if (!profileId) return;
    try {
      const params = new URLSearchParams();
      if (themes) params.set('themes', themes);
      if (limit) params.set('limit', String(limit));
      const url = `/api/progress/${profileId}/due?${params}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDueInfo(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch due cards:', err);
    }
  }, [profileId]);

  const recordAnswer = useCallback(async (cardId, result) => {
    if (!profileId) return;
    try {
      const res = await fetch(`/api/progress/${profileId}/card/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      });
      if (res.ok) {
        const data = await res.json();
        setStats(prev => prev ? { ...prev, ...data.stats } : data.stats);
        return data;
      }
    } catch (err) {
      console.error('Failed to record answer:', err);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchProgress(), fetchStats()])
      .finally(() => setLoading(false));
  }, [profileId, fetchProgress, fetchStats]);

  return { progress, stats, dueInfo, loading, fetchDue, fetchStats, recordAnswer, fetchProgress };
}
