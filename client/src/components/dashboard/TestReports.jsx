import { useState, useEffect } from 'react';
import StudyReport from '../StudyReport';

export default function TestReports({ profileId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!profileId) return;

    fetch(`/api/reports/${profileId}`)
      .then(res => res.ok ? res.json() : { reports: [] })
      .then(data => setReports(data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Test Reports</h2>
        <p className="text-slate-400">Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Test Reports</h2>
        <p className="text-slate-400">No test reports yet. Complete a Dynamic Test and generate a study report to see results here.</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-600';
    if (score >= 40) return 'bg-amber-600';
    return 'bg-red-600';
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">Test Reports</h2>
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              className="w-full text-left p-4 hover:bg-slate-600/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getScoreColor(r.score)}`}>
                    {r.score}%
                  </span>
                  <div>
                    <p className="text-white font-medium">{r.topic}</p>
                    <p className="text-xs text-slate-400">
                      {r.questionCount} questions &middot; {r.difficulty} &middot; {r.format}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {new Date(r.generatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {expandedId === r.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            </button>
            {expandedId === r.id && (
              <div className="px-4 pb-4 border-t border-slate-600 pt-4">
                <StudyReport report={r.report} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
