import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import ExportPDFButton, { exportProgressPDF } from '../components/ExportPDF';
import StatsCards from '../components/dashboard/StatsCards';
import AccuracyChart from '../components/dashboard/AccuracyChart';
import CategoryStrength from '../components/dashboard/CategoryStrength';
import WeakestCards from '../components/dashboard/WeakestCards';
import Heatmap from '../components/dashboard/Heatmap';
import TestReports from '../components/dashboard/TestReports';

export default function Dashboard({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Support viewing another profile's dashboard (from FamilyDashboard)
  const viewProfileId = location.state?.viewProfileId;
  const isViewingChild = viewProfileId && viewProfileId !== profile?.id;
  const effectiveProfileId = isViewingChild ? viewProfileId : profile?.id;

  const { stats, loading, fetchStats } = useProgress(effectiveProfileId);

  useEffect(() => {
    if (!profile) {
      navigate('/');
    }
  }, [profile, navigate]);

  if (!profile) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
        <div className="text-xl" style={{ color: 'var(--text-primary)' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {isViewingChild && (
            <div className="mb-4 bg-blue-900/40 border border-blue-600 rounded-lg p-3 flex items-center justify-between">
              <p className="text-blue-200 text-sm">Viewing dashboard for another profile</p>
              <button onClick={() => navigate('/family')} className="text-sm text-blue-300 hover:text-blue-200 underline">
                Back to Family
              </button>
            </div>
          )}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Progress Dashboard</h1>
              <p style={{ color: 'var(--text-secondary)' }}>{isViewingChild ? 'Learning analytics' : `${profile.name}'s learning analytics`}</p>
            </div>
            <ExportPDFButton
              label="Export Report"
              onClick={() => exportProgressPDF({ stats, profileName: profile.name })}
            />
          </div>

          {/* Header Stats */}
          <StatsCards stats={stats} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <AccuracyChart data={stats?.accuracyOverTime || []} />
            <CategoryStrength data={stats?.categoryBreakdown || []} />
          </div>

          {/* Heatmap */}
          <div className="mt-6">
            <Heatmap data={stats?.heatmapData || {}} />
          </div>

          {/* Test Reports */}
          <div className="mt-6">
            <TestReports profileId={effectiveProfileId} />
          </div>

          {/* Weakest Cards */}
          <div className="mt-6">
            <WeakestCards
              cards={stats?.weakestCards || []}
              onPractice={(cards) => {
                navigate('/flashcards', { state: { practiceCardIds: cards.map(c => c.cardId) } });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
