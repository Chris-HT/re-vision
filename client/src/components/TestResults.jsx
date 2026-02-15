import { useState } from 'react';
import { apiFetch } from '../utils/api';
import StudyReport from './StudyReport';

export default function TestResults({
  testData,
  answers,
  profile,
  onRetry,
  onNewTest,
  onSaveToBank
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const totalScore = answers.length > 0
    ? Math.round(answers.reduce((sum, a) => sum + (a?.score || 0), 0) / answers.length)
    : 0;

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
      const response = await apiFetch('/api/generate/save', {
        method: 'POST',
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

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportError(null);

    try {
      const response = await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          profileId: profile?.id,
          testData,
          answers
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.userMessage || data.error || 'Failed to generate report');
      }

      setReport(data.report);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-xl p-8 mb-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Test Complete!</h2>
          <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r ${getScoreColor(totalScore)} mb-4`}>
            <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalScore}%</span>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            You answered {answers.filter(a => a.isCorrect).length} out of {answers.length} questions correctly
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-input)' }}>
            <div className="text-2xl font-bold text-green-400">
              {answers.filter(a => a.score >= 70).length}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>High Scores (70%+)</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-input)' }}>
            <div className="text-2xl font-bold text-amber-400">
              {answers.filter(a => a.score >= 40 && a.score < 70).length}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Partial (40-69%)</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-input)' }}>
            <div className="text-2xl font-bold text-red-400">
              {answers.filter(a => a.score < 40).length}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Need Review (&lt;40%)</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Question Breakdown</h3>
          
          {testData.questions.map((question, index) => {
            const answer = answers[index];
            
            return (
              <div key={question.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-input)' }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      Q{index + 1}: {question.question}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ml-4 ${getScoreTextColor(answer.score)}`}>
                    {answer.score}%
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <span className="mr-2" style={{ color: 'var(--text-secondary)' }}>Your answer:</span>
                    <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>
                      {answer.format === 'multiple_choice' 
                        ? question.options?.find(o => o.startsWith(answer.studentAnswer))
                        : answer.studentAnswer}
                    </span>
                  </div>

                  {(!answer.isCorrect || answer.format === 'free_text') && (
                    <div className="flex items-start">
                      <span className="mr-2" style={{ color: 'var(--text-secondary)' }}>Correct answer:</span>
                      <span className="text-green-300 flex-1">{question.answer}</span>
                    </div>
                  )}

                  {answer.feedback && (
                    <div className="mt-2 p-3 rounded" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>{answer.feedback}</p>
                      {answer.keyPointsMissed?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {answer.keyPointsMissed.map((point, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
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

        {/* Study Report Section */}
        <div className="mt-8 border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
          {!report && !reportLoading && (
            <div className="text-center">
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Want personalised study advice based on your results?</p>
              <button
                onClick={handleGenerateReport}
                disabled={!profile}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all"
              >
                Generate Study Report
              </button>
              {!profile && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Select a profile to generate reports</p>
              )}
            </div>
          )}

          {reportLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>Analysing your performance...</p>
            </div>
          )}

          {reportError && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">
              <p className="text-red-200">{reportError}</p>
              <button
                onClick={handleGenerateReport}
                className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          )}

          {report && (
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Study Report</h3>
              <StudyReport report={report} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}