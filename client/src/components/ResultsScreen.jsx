import { useState } from 'react';

export default function ResultsScreen({ results, categories, onRestart, onReviewMissed }) {
  const [activeTab, setActiveTab] = useState('summary');
  
  const total = results.correct.length + results.missed.length + results.skipped.length;
  const score = Math.round((results.correct.length / total) * 100);
  
  const categoryBreakdown = {};
  [...results.correct, ...results.missed, ...results.skipped].forEach(card => {
    if (!categoryBreakdown[card.category]) {
      categoryBreakdown[card.category] = { correct: 0, missed: 0, skipped: 0, total: 0 };
    }
    categoryBreakdown[card.category].total++;
  });
  
  results.correct.forEach(card => {
    categoryBreakdown[card.category].correct++;
  });
  results.missed.forEach(card => {
    categoryBreakdown[card.category].missed++;
  });
  results.skipped.forEach(card => {
    categoryBreakdown[card.category].skipped++;
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-slate-800 rounded-xl p-8 mb-6">
        <h2 className="text-3xl font-bold text-white mb-6">Session Complete!</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold text-blue-400">{score}%</div>
            <div className="text-sm text-slate-400 mt-1">Score</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{results.correct.length}</div>
            <div className="text-sm text-slate-400 mt-1">Correct</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{results.missed.length}</div>
            <div className="text-sm text-slate-400 mt-1">Missed</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-slate-400">{results.skipped.length}</div>
            <div className="text-sm text-slate-400 mt-1">Skipped</div>
          </div>
        </div>

        <div className="border-b border-slate-700 mb-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Categories
            </button>
            {results.missed.length > 0 && (
              <button
                onClick={() => setActiveTab('missed')}
                className={`pb-3 px-1 font-medium transition-colors ${
                  activeTab === 'missed'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Missed Cards
              </button>
            )}
          </div>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <p className="text-slate-300">
              Great session! You answered {results.correct.length} out of {total} cards correctly.
            </p>
            {results.missed.length > 0 && (
              <p className="text-slate-300">
                Consider reviewing the {results.missed.length} cards you missed to strengthen your understanding.
              </p>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-3">
            {Object.entries(categoryBreakdown).map(([category, stats]) => {
              const categoryInfo = categories[category];
              const categoryScore = Math.round((stats.correct / stats.total) * 100);
              
              return (
                <div key={category} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo?.bgClass} text-white`}>
                      {category}
                    </span>
                    <span className="text-lg font-bold text-white">{categoryScore}%</span>
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-green-400">✓ {stats.correct}</span>
                    <span className="text-red-400">✗ {stats.missed}</span>
                    <span className="text-slate-400">→ {stats.skipped}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'missed' && results.missed.length > 0 && (
          <div className="space-y-3">
            {results.missed.map((card, index) => (
              <div key={index} className="bg-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${categories[card.category]?.bgClass} text-white`}>
                    {card.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Difficulty: {Array(card.difficulty).fill('⭐').join('')}
                  </span>
                </div>
                <p className="text-white font-medium mb-2">{card.question}</p>
                <p className="text-slate-300 text-sm">{card.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={onRestart}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          New Session
        </button>
        {results.missed.length > 0 && (
          <button
            onClick={() => onReviewMissed(results.missed)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
          >
            Review Missed Cards
          </button>
        )}
      </div>
    </div>
  );
}