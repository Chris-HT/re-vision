import { useState } from 'react';

export default function WeakestCards({ cards, onPractice }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!cards || cards.length === 0) {
    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Weakest Cards</h3>
        <p style={{ color: 'var(--text-muted)' }}>No cards need extra practice yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Weakest Cards</h3>
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
            className="rounded-lg p-3 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--bg-input)' }}
            onClick={() => setExpandedId(expandedId === card.cardId ? null : card.cardId)}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {card.question}
                </p>
              </div>
              <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.category}</span>
                <span className="text-xs text-red-400">{card.incorrectCount}x missed</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>EF: {card.easeFactor?.toFixed(1) ?? 'N/A'}</span>
              </div>
            </div>

            {expandedId === card.cardId && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.answer}</p>
                {card.lastSeen && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
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
