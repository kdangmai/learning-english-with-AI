import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { dashboardAPI, leaderboardAPI } from '../services/api';
import './Dashboard.css';

import { useUserStore } from '../store/store';

// Components
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';
import DashboardHero from '../components/dashboard/DashboardHero';
import SrsReviewWidget from '../components/dashboard/SrsReviewWidget';
import StatCards from '../components/dashboard/StatCards';
import WeeklySummaryBanner from '../components/dashboard/WeeklySummaryBanner';
import GrammarChart from '../components/dashboard/GrammarChart';
import WeeklyActivityChart from '../components/dashboard/WeeklyActivityChart';
import VocabStatusChart from '../components/dashboard/VocabStatusChart';
import TopicChart from '../components/dashboard/TopicChart';
import ScoreSummary from '../components/dashboard/ScoreSummary';
import MissionsTab from '../components/dashboard/MissionsTab';
import LevelModal from '../components/dashboard/LevelModal';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Khuya rồi, học chăm quá!', emoji: '🌙' };
  if (hour < 12) return { text: 'Chào buổi sáng!', emoji: '🌅' };
  if (hour < 18) return { text: 'Chào buổi chiều!', emoji: '☀️' };
  return { text: 'Chào buổi tối!', emoji: '🌆' };
}

export function Dashboard() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [overview, setOverview] = useState(null);
  const [vocabStats, setVocabStats] = useState(null);
  const [grammarProgress, setGrammarProgress] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [srsStats, setSrsStats] = useState(null);
  const [missions, setMissions] = useState([]);
  const [levelData, setLevelData] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const response = await dashboardAPI.getAllData();
        const data = response.data;

        if (data.success) {
          setOverview(data.overview);
          setVocabStats(data.vocabStats);
          setGrammarProgress(data.grammarProgress);
          setSessionStats(data.sessionStats);
          setWeeklyReport(data.weeklyReport);

          if (data.srsStats) {
            setSrsStats(data.srsStats);
          }

          if (data.missions) {
            setMissions(data.missions.missions);
            setLevelData({
              xp: data.missions.xp,
              level: data.missions.level,
              levelInfo: data.missions.levelInfo,
              streak: data.missions.streak
            });
          }
        }

        // Fetch Leaderboard for Rank
        try {
          const lbResponse = await leaderboardAPI.getLeaderboard('exp');
          if (lbResponse.data.success) {
            const leaderboard = lbResponse.data.leaderboard;
            // The leaderboard API usually returns the user's rank in a 'userRank' field if supported,
            // or we can find it in the list.
            if (lbResponse.data.userRank) {
              setRank(lbResponse.data.userRank);
            } else if (user?._id) {
              const userIndex = leaderboard.findIndex(u => u._id === user._id);
              if (userIndex !== -1) {
                setRank(userIndex + 1);
              }
            }
          }
        } catch (lbErr) {
          console.error("Leaderboard fetch error", lbErr);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  const handleClaimMission = useCallback(async (mission) => {
    try {
      const response = await dashboardAPI.claimMission(mission.id, mission.xp);
      const data = response.data;
      if (data.success) {
        setLevelData({ xp: data.xp, level: data.level, levelInfo: data.levelInfo, streak: data.streak });
        setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, claimed: true } : m));
      }
    } catch (err) {
      console.error('Claim error', err);
    }
  }, []);

  const claimableMissions = useMemo(() => missions.filter(m => m.completed && !m.claimed).length, [missions]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard">
      <LevelModal
        show={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        levelData={levelData}
      />

      <DashboardHero
        greeting={greeting}
        levelData={levelData}
        onLevelClick={() => setShowLevelModal(true)}
        rank={rank}
      />

      {/* <QuickActions /> Removed */}

      <div className="dashboard-tabs">
        <button className={`dash-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📈 Tổng Quan
        </button>
        <button className={`dash-tab ${activeTab === 'missions' ? 'active' : ''}`} onClick={() => setActiveTab('missions')}>
          🎯 Nhiệm Vụ
          {claimableMissions > 0 && (
            <span className="tab-badge">{claimableMissions}</span>
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <SrsReviewWidget srsStats={srsStats} />

          <StatCards
            overview={overview}
            grammarProgress={grammarProgress}
            sessionStats={sessionStats}
          />

          <WeeklySummaryBanner weeklyReport={weeklyReport} />

          <div className="section-label"><span>📉</span> Biểu đồ chi tiết</div>
          <div className="charts-grid">
            <GrammarChart grammarProgress={grammarProgress} />
            <WeeklyActivityChart sessionStats={sessionStats} />
            <VocabStatusChart vocabStats={vocabStats} />
            <TopicChart heatmap={vocabStats?.heatmap} />
            <ScoreSummary overview={overview} sessionStats={sessionStats} />
          </div>
        </>
      )}

      {activeTab === 'missions' && (
        <MissionsTab
          missions={missions}
          levelData={levelData}
          onClaimMission={handleClaimMission}
        />
      )}
    </div>
  );
}

export default Dashboard;
