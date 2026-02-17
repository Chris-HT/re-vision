import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export function useQuestions(subjectId, theme = null) {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = theme
          ? `/api/subjects/${subjectId}/questions?theme=${theme}`
          : `/api/subjects/${subjectId}/questions`;

        const response = await apiFetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to fetch questions');

        const data = await response.json();
        setQuestions(data.questions);
        setCategories(data.categories);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchQuestions();
    return () => controller.abort();
  }, [subjectId, theme]);

  return { questions, categories, loading, error };
}