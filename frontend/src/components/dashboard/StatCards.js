import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedStatValue from '../common/AnimatedStatValue';

const StatCards = ({ overview, grammarProgress, sessionStats }) => {
    const navigate = useNavigate();

    const totalVocab = overview?.totalVocabulary || 0;
    const vocabPercent = totalVocab > 0 ? Math.round((overview?.vocabularyMastered || 0) / totalVocab * 100) : 0;

    const avgScore = sessionStats?.summary?.averageScore ? Math.round(sessionStats.summary.averageScore * 10) / 10 : 0;

    const grammarData = useMemo(() => {
        if (!grammarProgress?.data) return [];
        return grammarProgress.data.map(g => ({ ...g }));
    }, [grammarProgress]);

    const totalExercises = grammarData.reduce((sum, g) => sum + (g.exercisesAttempted || 0), 0);
    const totalCorrect = grammarData.reduce((sum, g) => sum + (g.exercisesCorrect || 0), 0);
    const grammarAccuracy = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;

    return (
        <>
            <div className="section-label"><span>📊</span> Thống kê tổng quan</div>
            <div className="stats-grid">
                <div className="stat-card gradient-blue" onClick={() => navigate('/vocabulary')}>
                    <div className="stat-icon">📖</div>
                    <div className="stat-info">
                        <p className="stat-label">Từ vựng</p>
                        <p className="stat-value"><AnimatedStatValue value={totalVocab} /></p>
                        <p className="stat-sub">{overview?.vocabularyMastered || 0} thành thạo</p>
                    </div>
                    <div className="stat-progress-ring">
                        <svg viewBox="0 0 36 36">
                            <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="ring-fill blue" strokeDasharray={`${vocabPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="20.5" className="ring-text">{vocabPercent}%</text>
                        </svg>
                    </div>
                </div>

                <div className="stat-card gradient-green" onClick={() => navigate('/sentence-writing')}>
                    <div className="stat-icon">📝</div>
                    <div className="stat-info">
                        <p className="stat-label">Câu đã nộp</p>
                        <p className="stat-value"><AnimatedStatValue value={overview?.sentencesSubmitted || 0} /></p>
                        <p className="stat-sub">Điểm TB: {avgScore}/10</p>
                    </div>
                </div>

                <div className="stat-card gradient-orange" onClick={() => navigate('/grammar')}>
                    <div className="stat-icon">📚</div>
                    <div className="stat-info">
                        <p className="stat-label">Ngữ pháp</p>
                        <p className="stat-value"><AnimatedStatValue value={totalExercises} /></p>
                        <p className="stat-sub">Bài tập · {grammarAccuracy}% đúng</p>
                    </div>
                    <div className="stat-progress-ring">
                        <svg viewBox="0 0 36 36">
                            <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="ring-fill orange" strokeDasharray={`${grammarAccuracy}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="20.5" className="ring-text">{grammarAccuracy}%</text>
                        </svg>
                    </div>
                </div>

                <div className="stat-card gradient-purple" onClick={() => navigate('/chatbot')}>
                    <div className="stat-icon">💬</div>
                    <div className="stat-info">
                        <p className="stat-label">Phiên chat</p>
                        <p className="stat-value"><AnimatedStatValue value={sessionStats?.summary?.totalSessions || 0} /></p>
                        <p className="stat-sub">Với AI tutor</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StatCards;
