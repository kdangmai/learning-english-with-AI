import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LEVEL_COLORS,
    LEVEL_BADGES,
    LEVEL_LABELS,
    CATEGORY_LABEL
} from './constants';

const MissionsTab = ({ missions, levelData, onClaimMission }) => {
    const navigate = useNavigate();
    const [missionFilter, setMissionFilter] = useState('all');

    // Mock Cumulative Missions (Achievements) based on Level Data
    const cumulativeMissions = useMemo(() => {
        if (!levelData) return [];

        const achievements = [
            {
                id: 'ach_level_5', title: 'Phiêu lưu giả', description: 'Đạt cấp độ Elementary (Level 2)',
                target: 500, current: levelData.xp, xp: 100, icon: '🥉', category: 'achievement',
                completed: levelData.xp >= 500, claimed: levelData.xp >= 500, type: 'cumulative', link: '/dashboard'
            },
            {
                id: 'ach_streak_7', title: 'Chăm chỉ', description: 'Duy trì chuỗi 7 ngày',
                target: 7, current: levelData.streak, xp: 200, icon: '🔥', category: 'achievement',
                completed: levelData.streak >= 7, claimed: false, type: 'cumulative', link: '/dashboard'
            },
            {
                id: 'ach_xp_1000', title: 'Học giả sơ cấp', description: 'Đạt 1000 XP tổng cộng',
                target: 1000, current: levelData.xp, xp: 150, icon: '✨', category: 'achievement',
                completed: levelData.xp >= 1000, claimed: levelData.xp >= 1000, type: 'cumulative', link: '/dashboard'
            }
        ];
        return achievements;
    }, [levelData]);

    const filteredMissions = useMemo(() => {
        if (missionFilter === 'cumulative') {
            // Merge backend milestones with our mock achievements
            const milestones = missions.filter(m => m.type === 'milestone');
            return [...milestones, ...cumulativeMissions];
        }

        if (missionFilter === 'all') return [...missions, ...cumulativeMissions];

        if (missionFilter === 'daily') return missions.filter(m => m.type === 'daily');

        return missions.filter(m => m.category === missionFilter);
    }, [missions, missionFilter, cumulativeMissions]);

    return (
        <div className="missions-container">
            {/* Level Card */}
            {levelData && (
                <div className="level-card">
                    <div className="level-card-top">
                        <div className="level-card-icon" style={{ background: `linear-gradient(135deg, ${LEVEL_COLORS[levelData.level]}40, ${LEVEL_COLORS[levelData.level]}15)` }}>
                            <span style={{ fontSize: '2.5rem' }}>{LEVEL_BADGES[levelData.level] || '🎓'}</span>
                        </div>
                        <div className="level-card-info">
                            <h2 style={{ color: LEVEL_COLORS[levelData.level] }}>
                                {LEVEL_LABELS[levelData.level] || levelData.level}
                            </h2>
                            <p className="level-card-xp">{levelData.xp} XP tổng cộng</p>
                            {levelData.streak > 0 && (
                                <div className="level-streak">🔥 Chuỗi {levelData.streak} ngày liên tục</div>
                            )}
                        </div>
                    </div>
                    {levelData.levelInfo.nextLevel && (
                        <div className="level-card-progress">
                            <div className="level-progress-labels">
                                <span>{LEVEL_LABELS[levelData.level]}</span>
                                <span>{levelData.levelInfo.xpProgress}%</span>
                                <span>{LEVEL_LABELS[levelData.levelInfo.nextLevel]}</span>
                            </div>
                            <div className="level-progress-track">
                                <div className="level-progress-fill" style={{
                                    width: `${levelData.levelInfo.xpProgress}%`,
                                    background: `linear-gradient(90deg, ${LEVEL_COLORS[levelData.level]}, ${LEVEL_COLORS[levelData.levelInfo.nextLevel]})`
                                }} />
                            </div>
                            <p className="level-progress-hint">Còn {levelData.levelInfo.xpNeeded} XP để lên cấp</p>
                        </div>
                    )}
                </div>
            )}

            {/* Mission Filters */}
            <div className="mission-filters">
                {[
                    { key: 'all', label: '🎯 Tất cả' },
                    { key: 'daily', label: '📅 Hàng ngày' },
                    { key: 'cumulative', label: '🏅 Thành tựu' },
                    { key: 'vocabulary', label: '📖 Từ vựng' },
                    { key: 'grammar', label: '📐 Ngữ pháp' },
                    { key: 'sentence', label: '✍️ Luyện dịch' },
                    { key: 'communication', label: '💬 Giao tiếp' },
                    { key: 'general', label: '🏆 Chung' },
                ].map(f => (
                    <button
                        key={f.key}
                        className={`mission-filter-btn ${missionFilter === f.key ? 'active' : ''}`}
                        onClick={() => setMissionFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Mission List */}
            <div className="missions-list">
                {filteredMissions.map(mission => (
                    <div key={mission.id} className={`mission-card ${mission.completed ? 'completed' : ''} ${mission.claimed ? 'claimed' : ''}`}>
                        <div className="mission-icon-wrap">
                            <span className="mission-icon">{mission.icon}</span>
                        </div>
                        <div className="mission-content">
                            <div className="mission-header-row">
                                <h4 className="mission-title">{mission.title}</h4>
                                <span className="mission-xp-badge">+{mission.xp} XP</span>
                            </div>
                            <p className="mission-desc">{mission.description}</p>
                            <div className="mission-category-tag">{CATEGORY_LABEL[mission.category]}</div>
                            <div className="mission-progress-row">
                                <div className="mission-progress-track">
                                    <div
                                        className="mission-progress-fill"
                                        style={{ width: `${mission.progress}%` }}
                                    />
                                </div>
                                <span className="mission-progress-text">{mission.current}/{mission.target}</span>
                            </div>
                        </div>
                        <div className="mission-action">
                            {mission.claimed ? (
                                <span className="mission-claimed-badge">✅ Đã nhận</span>
                            ) : mission.completed ? (
                                <button className="mission-claim-btn" onClick={() => onClaimMission(mission)}>
                                    🎁 Nhận thưởng
                                </button>
                            ) : (
                                <button className="mission-go-btn" onClick={() => navigate(mission.link)}>
                                    Thực hiện →
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {filteredMissions.length === 0 && (
                    <div className="empty-missions">
                        <span style={{ fontSize: '2rem' }}>🎯</span>
                        <p>Không có nhiệm vụ nào trong danh mục này.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MissionsTab;
