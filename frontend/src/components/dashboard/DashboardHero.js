import React from 'react';
import {
    LEVEL_COLORS,
    LEVEL_LABELS,
    LEVEL_BADGES
} from './constants';

const DashboardHero = ({ greeting, levelData, onLevelClick, rank }) => {
    return (
        <div className="dashboard-hero">
            <div className="hero-content">
                <div className="hero-greeting">
                    <span className="hero-emoji">{greeting.emoji}</span>
                    <div>
                        <h1>{greeting.text}</h1>
                        <p className="hero-subtitle">Tiếp tục hành trình học tiếng Anh của bạn</p>
                    </div>
                </div>
                <div className="hero-badges">
                    {levelData && (
                        <button
                            className="level-badge-btn"
                            onClick={onLevelClick}
                            style={{ borderColor: LEVEL_COLORS[levelData.level] }}
                        >
                            <div className="level-badge-inner">
                                <span className="level-emoji">{LEVEL_BADGES[levelData.level] || '🎓'}</span>
                                <div className="level-text">
                                    <span className="level-name" style={{ color: LEVEL_COLORS[levelData.level] }}>
                                        {LEVEL_LABELS[levelData.level] || levelData.level}
                                    </span>
                                    <span className="xp-text">{levelData.xp?.toLocaleString()} XP</span>
                                </div>
                            </div>
                            {levelData.streak > 0 && (
                                <div className="streak-badge-mini">🔥 {levelData.streak}</div>
                            )}
                        </button>
                    )}

                    {/* Rank Badge */}
                    {rank && (
                        <div className="rank-badge-hero">
                            <span className="rank-icon">🏆</span>
                            <div className="rank-info">
                                <span className="rank-label">Hạng</span>
                                <span className="rank-value">#{rank}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* XP Progress Bar */}
            {levelData?.levelInfo?.nextLevel && (
                <div className="hero-xp-bar">
                    <div className="xp-bar-labels">
                        <span style={{ color: LEVEL_COLORS[levelData.level] }}>
                            {LEVEL_BADGES[levelData.level]} {LEVEL_LABELS[levelData.level]}
                        </span>
                        <span className="xp-bar-percent">{levelData.levelInfo.xpProgress}%</span>
                        <span style={{ color: LEVEL_COLORS[levelData.levelInfo.nextLevel] }}>
                            {LEVEL_BADGES[levelData.levelInfo.nextLevel]} {LEVEL_LABELS[levelData.levelInfo.nextLevel]}
                        </span>
                    </div>
                    <div className="xp-bar-track-hero">
                        <div className="xp-bar-fill-hero" style={{
                            width: `${levelData.levelInfo.xpProgress}%`,
                            background: `linear-gradient(90deg, ${LEVEL_COLORS[levelData.level]}, ${LEVEL_COLORS[levelData.levelInfo.nextLevel]})`
                        }} />
                    </div>
                    <p className="xp-remaining-hero">Còn <strong>{levelData.levelInfo.xpNeeded?.toLocaleString()}</strong> XP để lên cấp</p>
                </div>
            )}
        </div>
    );
};

export default DashboardHero;
