export default function StudyReport({ report }) {
  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-input)' }}>
        <h4 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Summary</h4>
        <p style={{ color: 'var(--text-primary)' }}>{report.summary}</p>
      </div>

      {/* Strengths */}
      {report.strengths?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Strengths</h4>
          <div className="flex flex-wrap gap-2">
            {report.strengths.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-green-900/50 border border-green-600 text-green-300 rounded-full text-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weak Areas */}
      {report.weakAreas?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Areas to Improve</h4>
          <div className="space-y-3">
            {report.weakAreas.map((w, i) => (
              <div key={i} className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                <p className="text-amber-200 font-medium">{w.area}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{w.reason}</p>
                <p className="text-blue-300 text-sm mt-1">{w.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Plan */}
      {report.studyPlan?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Study Plan</h4>
          <div className="space-y-2">
            {report.studyPlan.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {item.priority || i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.topic}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.action}</p>
                </div>
                {item.timeEstimate && (
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{item.timeEstimate}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement */}
      {report.encouragement && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
          <p className="text-blue-200 italic">{report.encouragement}</p>
        </div>
      )}
    </div>
  );
}
