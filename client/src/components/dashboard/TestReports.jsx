import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import StudyReport from '../StudyReport';

export default function TestReports({ profileId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!profileId) return;

    apiFetch(`/api/reports/${profileId}`)
      .then(res => res.ok ? res.json() : { reports: [] })
      .then(data => setReports(data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Test Reports</h2>
        <p style={{ color: 'var(--text-muted)' }}>Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Test Reports</h2>
        <p style={{ color: 'var(--text-muted)' }}>No test reports yet. Complete a Dynamic Test and generate a study report to see results here.</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-600';
    if (score >= 40) return 'bg-amber-600';
    return 'bg-red-600';
  };

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Test Reports</h2>
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
            <button
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              className="w-full text-left p-4 hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getScoreColor(r.score)}`}>
                    {r.score}%
                  </span>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.topic}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.questionCount} questions &middot; {r.difficulty} &middot; {r.format}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.generatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {expandedId === r.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            </button>
            {expandedId === r.id && (
              <div className="px-4 pb-4 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
                <StudyReport report={r.report} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
