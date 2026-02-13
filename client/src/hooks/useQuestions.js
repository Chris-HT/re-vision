import { useState, useEffect } from 'react';

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

    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = theme 
          ? `/api/subjects/${subjectId}/questions?theme=${theme}`
          : `/api/subjects/${subjectId}/questions`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch questions');
        
        const data = await response.json();
        setQuestions(data.questions);
        setCategories(data.categories);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [subjectId, theme]);

  return { questions, categories, loading, error };
}