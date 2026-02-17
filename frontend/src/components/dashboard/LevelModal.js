import React from 'react';
import {
    LEVEL_COLORS,
    LEVEL_LABELS,
    LEVEL_THRESHOLDS,
    LEVEL_ORDER,
    LEVEL_BADGES
} from './constants';

const LevelModal = ({ show, onClose, levelData }) => {
    if (!show) return null;

    return (
        <div className="level-modal-overlay" onClick={onClose}>
            <div className="level-modal-content" onClick={e => e.stopPropagation()}>
                <div className="level-modal-header">
                    <h2>🏆 Hệ thống Cấp bậc</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="current-xp-info">
                    <div className="current-lvl-display">
                        <div className="lvl-main-icon" style={{ backgroundColor: LEVEL_COLORS[levelData?.level] }}>
                            {LEVEL_BADGES[levelData?.level]}
                        </div>
                        <div className="lvl-main-text">
                            <span className="lvl-label-mini">Cấp độ hiện tại</span>
                            <h3>{LEVEL_LABELS[levelData?.level]}</h3>
                        </div>
                    </div>

                    <div className="xp-stat-info">
                        <p><strong>{levelData?.xp?.toLocaleString()}</strong> XP / {levelData?.levelInfo?.nextLevel ? LEVEL_THRESHOLDS[levelData.levelInfo.nextLevel]?.toLocaleString() : 'Max'} XP</p>
                        <div className="xp-progress-mini">
                            <div
                                className="xp-bar-fill"
                                style={{
                                    width: `${levelData?.levelInfo?.xpProgress || 0}%`,
                                    background: `linear-gradient(90deg, ${LEVEL_COLORS[levelData?.level]}, ${LEVEL_COLORS[levelData?.levelInfo?.nextLevel] || LEVEL_COLORS[levelData?.level]})`
                                }}
                            ></div>
                        </div>
                        <p className="next-level-hint">
                            {levelData?.levelInfo?.nextLevel
                                ? `Còn ${levelData?.levelInfo?.xpNeeded?.toLocaleString()} XP để đạt ${LEVEL_LABELS[levelData?.levelInfo?.nextLevel]}`
                                : 'Bạn đã đạt cấp độ cao nhất! 🏆'}
                        </p>
                    </div>
                </div>

                <div className="level-list">
                    {LEVEL_ORDER.map((lvl) => {
                        const isCurrent = lvl === levelData?.level;
                        const isUnlocked = (levelData?.xp || 0) >= LEVEL_THRESHOLDS[lvl];
                        const effectiveUnlocked = isUnlocked || lvl === 'beginner';

                        return (
                            <div
                                key={lvl}
                                className={`level-item ${isCurrent ? 'current' : ''} ${effectiveUnlocked ? 'unlocked' : 'locked'}`}
                                style={{ '--level-color': LEVEL_COLORS[lvl] }}
                            >
                                <div className="level-icon-wrapper" style={{
                                    background: effectiveUnlocked
                                        ? `linear-gradient(135deg, ${LEVEL_COLORS[lvl]}, ${LEVEL_COLORS[lvl]}dd)`
                                        : 'var(--bg-input)'
                                }}>
                                    {effectiveUnlocked ? LEVEL_BADGES[lvl] : '🔒'}
                                </div>
                                <div className="level-info-row">
                                    <div className="level-title-group">
                                        <h3>{LEVEL_LABELS[lvl]}</h3>
                                        {isCurrent && <span className="current-badge">Hiện tại</span>}
                                        {!effectiveUnlocked && <span className="locked-badge">Chưa mở khoá</span>}
                                    </div>
                                    <div className="level-requirement">
                                        <span className="lvl-threshold-val">{LEVEL_THRESHOLDS[lvl].toLocaleString()}</span>
                                        <span className="lvl-xp-unit">XP</span>
                                    </div>
                                </div>
                                {isCurrent && <div className="current-indicator-pulse" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LevelModal;
