import { useState, useEffect } from 'react';

export default function FlashcardDeck({ questions, categories, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({
    correct: [],
    missed: [],
    skipped: []
  });

  const currentCard = questions[currentIndex];
  const categoryInfo = categories[currentCard?.category];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      } else if (e.key === '1') {
        handleAnswer('correct');
      } else if (e.key === '2') {
        handleAnswer('missed');
      } else if (e.key === '3') {
        handleAnswer('skipped');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, currentIndex]);

  const handleAnswer = (type) => {
    setResults(prev => ({
      ...prev,
      [type]: [...prev[type], currentCard]
    }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      onComplete(results);
    }
  };

  if (!currentCard) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">
            Card {currentIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo?.bgClass} text-white`}>
              {currentCard.category}
            </span>
            <span className="text-sm text-slate-400">
              Difficulty: {Array(currentCard.difficulty).fill('⭐').join('')}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
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

      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={() => handleAnswer('correct')}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>✓</span>
          <span>Got it (1)</span>
        </button>
        <button
          onClick={() => handleAnswer('missed')}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>✗</span>
          <span>Missed (2)</span>
        </button>
        <button
          onClick={() => handleAnswer('skipped')}
          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>→</span>
          <span>Skip (3)</span>
        </button>
      </div>
    </div>
  );
}