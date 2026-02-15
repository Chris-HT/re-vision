import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResultsScreen from '../components/ResultsScreen';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { results, categories } = location.state || {};

  useEffect(() => {
    if (!results) navigate('/flashcards');
  }, [results, navigate]);

  if (!results) return null;

  const handleRestart = () => {
    navigate('/flashcards');
  };

  const handleReviewMissed = (missedCards) => {
    navigate('/flashcards', { state: { reviewCards: missedCards } });
  };

  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
      <ResultsScreen
        results={results}
        categories={categories}
        onRestart={handleRestart}
        onReviewMissed={handleReviewMissed}
      />
    </div>
  );
}