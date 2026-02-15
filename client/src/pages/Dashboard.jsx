import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { stats, loading, fetchStats } = useProgress(profile?.id);

  useEffect(() => {
    if (!profile) {
      navigate('/');
    }
  }, [profile, navigate]);

  if (!profile) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Progress Dashboard</h1>
              <p className="text-slate-300">{profile.name}'s learning analytics</p>
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
            <TestReports profileId={profile.id} />
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
