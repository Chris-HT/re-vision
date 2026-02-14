import { useState } from 'react';

export default function WeakestCards({ cards, onPractice }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!cards || cards.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Weakest Cards</h3>
        <p className="text-slate-400">No weak cards yet. Keep studying!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Weakest Cards</h3>
        {cards.length > 0 && (
          <button
            onClick={() => onPractice(cards)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Practice These
          </button>
        )}
      </div>

      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.cardId}
            className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition-colors"
            onClick={() => setExpandedId(expandedId === card.cardId ? null : card.cardId)}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">
                  {card.question}
                </p>
              </div>
              <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                <span className="text-xs text-slate-400">{card.category}</span>
                <span className="text-xs text-red-400">{card.incorrectCount}x missed</span>
                <span className="text-xs text-slate-500">EF: {card.easeFactor.toFixed(1)}</span>
              </div>
            </div>

            {expandedId === card.cardId && (
              <div className="mt-3 pt-3 border-t border-slate-600">
                <p className="text-slate-300 text-sm">{card.question}</p>
                {card.lastSeen && (
                  <p className="text-xs text-slate-500 mt-2">
                    Last seen: {new Date(card.lastSeen).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
