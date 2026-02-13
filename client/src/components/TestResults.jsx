import { useState } from 'react';

export default function TestResults({ 
  testData, 
  answers, 
  onRetry, 
  onNewTest,
  onSaveToBank 
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const totalScore = Math.round(
    answers.reduce((sum, a) => sum + a.score, 0) / answers.length
  );

  const getScoreColor = (score) => {
    if (score >= 70) return 'from-green-500 to-green-600';
    if (score >= 40) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const getScoreTextColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleSaveToBank = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: testData.meta.topic.toLowerCase().replace(/\s+/g, '-'),
          themeId: 'generated',
          questions: testData.questions
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save questions');
      }

      setSaved(true);
      if (onSaveToBank) onSaveToBank(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-slate-800 rounded-xl p-8 mb-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Test Complete!</h2>
          <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r ${getScoreColor(totalScore)} mb-4`}>
            <span className="text-4xl font-bold text-white">{totalScore}%</span>
          </div>
          <p className="text-lg text-slate-300">
            You answered {answers.filter(a => a.isCorrect).length} out of {answers.length} questions correctly
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {answers.filter(a => a.score >= 70).length}
            </div>
            <div className="text-sm text-slate-400 mt-1">High Scores (70%+)</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {answers.filter(a => a.score >= 40 && a.score < 70).length}
            </div>
            <div className="text-sm text-slate-400 mt-1">Partial (40-69%)</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {answers.filter(a => a.score < 40).length}
            </div>
            <div className="text-sm text-slate-400 mt-1">Need Review (&lt;40%)</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white mb-4">Question Breakdown</h3>
          
          {testData.questions.map((question, index) => {
            const answer = answers[index];
            
            return (
              <div key={question.id} className="bg-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">
                      Q{index + 1}: {question.question}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ml-4 ${getScoreTextColor(answer.score)}`}>
                    {answer.score}%
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <span className="text-slate-400 mr-2">Your answer:</span>
                    <span className="text-slate-200 flex-1">
                      {answer.format === 'multiple_choice' 
                        ? question.options?.find(o => o.startsWith(answer.studentAnswer))
                        : answer.studentAnswer}
                    </span>
                  </div>

                  {(!answer.isCorrect || answer.format === 'free_text') && (
                    <div className="flex items-start">
                      <span className="text-slate-400 mr-2">Correct answer:</span>
                      <span className="text-green-300 flex-1">{question.answer}</span>
                    </div>
                  )}

                  {answer.feedback && (
                    <div className="mt-2 p-3 bg-slate-800 rounded">
                      <p className="text-slate-200">{answer.feedback}</p>
                      {answer.keyPointsMissed?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {answer.keyPointsMissed.map((point, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-600 rounded text-xs text-slate-300">
                              {point}
                            </span>
                          ))}
                        </div>
                      )}
                      {answer.encouragement && (
                        <p className="text-blue-300 italic mt-2 text-xs">{answer.encouragement}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={onNewTest}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            New Test
          </button>

          {!saved && !testData.cached && (
            <button
              onClick={handleSaveToBank}
              disabled={saving || saved}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save to Bank'}
            </button>
          )}
        </div>

        {saved && (
          <div className="mt-4 bg-green-900/50 border border-green-600 rounded-lg p-4">
            <p className="text-green-200">
              Questions saved successfully! They'll now appear in Flashcard mode.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-600 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}