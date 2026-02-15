import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export function useProgress(profileId) {
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [dueInfo, setDueInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async (signal) => {
    if (!profileId) return;
    try {
      const res = await apiFetch(`/api/progress/${profileId}`, { signal });
      if (res.ok) setProgress(await res.json());
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Failed to fetch progress:', err);
    }
  }, [profileId]);

  const fetchStats = useCallback(async (signal) => {
    if (!profileId) return;
    try {
      const res = await apiFetch(`/api/progress/${profileId}/stats`, { signal });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Failed to fetch stats:', err);
    }
  }, [profileId]);

  const fetchDue = useCallback(async (themes = null, limit = 30) => {
    if (!profileId) return;
    try {
      const params = new URLSearchParams();
      if (themes) params.set('themes', themes);
      if (limit) params.set('limit', String(limit));
      const url = `/api/progress/${profileId}/due?${params}`;
      const res = await apiFetch(url);
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
      const res = await apiFetch(`/api/progress/${profileId}/card/${cardId}`, {
        method: 'PUT',
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
    const controller = new AbortController();
    setLoading(true);
    Promise.all([fetchProgress(controller.signal), fetchStats(controller.signal)])
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [profileId, fetchProgress, fetchStats]);

  return { progress, stats, dueInfo, loading, fetchDue, fetchStats, recordAnswer, fetchProgress };
}
