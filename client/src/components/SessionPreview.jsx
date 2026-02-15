export default function SessionPreview({
  questionCount,
  format,
  topic,
  estimatedMinutes,
  nextStep,
  onStart,
  onBack
}) {
  const formatLabel = {
    multiple_choice: 'Multiple choice',
    free_text: 'Free text',
    mix: 'Multiple choice and free text',
    flashcard: 'Flashcard Q&A'
  };

  return (
    <div className="max-w-lg mx-auto">
      <div
        className="rounded-xl p-8 border"
        style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Ready to start?
        </h2>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5" style={{ color: 'var(--text-muted)' }}>&#128221;</span>
            <p style={{ color: 'var(--text-primary)' }}>
              {questionCount} {topic ? `questions on ${topic}` : 'flashcards'}
            </p>
          </div>

          {format && (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5" style={{ color: 'var(--text-muted)' }}>&#128196;</span>
              <p style={{ color: 'var(--text-secondary)' }}>
                Format: {formatLabel[format] || format}
              </p>
            </div>
          )}

          {estimatedMinutes > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5" style={{ color: 'var(--text-muted)' }}>&#9200;</span>
              <p style={{ color: 'var(--text-secondary)' }}>
                Estimated time: About {estimatedMinutes} minutes
              </p>
            </div>
          )}

          {nextStep && (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5" style={{ color: 'var(--text-muted)' }}>&#10145;</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {nextStep}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStart}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white font-medium rounded-lg transition-all"
          >
            Start
          </button>
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
          >
            Change Settings
          </button>
        </div>
      </div>
    </div>
  );
}
