import { useLocation, useNavigate } from 'react-router-dom';
import ResultsScreen from '../components/ResultsScreen';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { results, categories } = location.state || {};

  if (!results) {
    navigate('/flashcards');
    return null;
  }

  const handleRestart = () => {
    navigate('/flashcards');
  };

  const handleReviewMissed = (missedCards) => {
    navigate('/flashcards', { state: { reviewCards: missedCards } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <ResultsScreen
        results={results}
        categories={categories}
        onRestart={handleRestart}
        onReviewMissed={handleReviewMissed}
      />
    </div>
  );
}