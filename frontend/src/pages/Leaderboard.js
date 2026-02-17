import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import { useUserStore } from '../store/store';
import './Leaderboard.css';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Leaderboard() {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('exp');
    const { user } = useUserStore();

    const tabs = [
        { id: 'exp', label: 'Experience', icon: '🔥' },
        { id: 'vocab', label: 'Vocabulary', icon: '📖' },
        { id: 'roleplay', label: 'Roleplay', icon: '💬' },
        { id: 'grammar', label: 'Grammar', icon: '✍️' },
        { id: 'sentence', label: 'Sentences', icon: '🧩' },
        { id: 'pronunciation', label: 'Pronunciation', icon: '🎙️' },
    ];

    useEffect(() => {
        fetchLeaderboard(activeTab);
    }, [activeTab]);

    const fetchLeaderboard = async (type) => {
        setLoading(true);
        try {
            const response = await leaderboardAPI.getLeaderboard(type);
            if (response.data.success) {
                setLeaderboardData(response.data.leaderboard);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const topThree = leaderboardData.slice(0, 3);
    const restList = leaderboardData.slice(3);

    const formatScore = (val) => {
        if (val === undefined || val === null) return 0;
        return val.toLocaleString();
    };

    const getScoreLabel = () => {
        switch (activeTab) {
            case 'exp': return 'XP';
            case 'vocab': return 'Words';
            case 'roleplay': return 'Sessions';
            case 'grammar': return 'Exercises';
            case 'sentence': return 'Sentences';
            case 'pronunciation': return 'Points';
            default: return 'Points';
        }
    };

    return (
        <div className="leaderboard-container">
            <header className="leaderboard-header">
                <motion.h1
                    className="leaderboard-title"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    Hall of Fame
                </motion.h1>
            </header>

            <div className="leaderboard-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loader"></div>
                </div>
            ) : (
                <div className="leaderboard-content">
                    <AnimatePresence mode='wait'>
                        {/* Podium Section - Using fixed order for layout stability */}
                        {topThree.length > 0 && (
                            <motion.div
                                className="podium-container"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.5 }}
                            >
                                {/* 2nd Place */}
                                {topThree[1] && (
                                    <div className="podium-item second">
                                        <div className="podium-avatar-wrapper">
                                            <img
                                                src={topThree[1].avatar || `https://ui-avatars.com/api/?name=${topThree[1].username}`}
                                                alt="Avatar"
                                                className="podium-avatar"
                                            />
                                            <div className="rank-badge">2</div>
                                        </div>
                                        <div className="user-name">{topThree[1].fullName}</div>
                                        <div className="user-score">
                                            {formatScore(topThree[1].value)}
                                            <span className="score-label">{getScoreLabel()}</span>
                                        </div>
                                        <div className="podium-block"></div>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {topThree[0] && (
                                    <div className="podium-item first">
                                        <div className="podium-avatar-wrapper">
                                            <div className="crown-icon">👑</div>
                                            <img
                                                src={topThree[0].avatar || `https://ui-avatars.com/api/?name=${topThree[0].username}`}
                                                alt="Avatar"
                                                className="podium-avatar"
                                            />
                                            <div className="rank-badge">1</div>
                                        </div>
                                        <div className="user-name">{topThree[0].fullName}</div>
                                        <div className="user-score">
                                            {formatScore(topThree[0].value)}
                                            <span className="score-label">{getScoreLabel()}</span>
                                        </div>
                                        <div className="podium-block"></div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {topThree[2] && (
                                    <div className="podium-item third">
                                        <div className="podium-avatar-wrapper">
                                            <img
                                                src={topThree[2].avatar || `https://ui-avatars.com/api/?name=${topThree[2].username}`}
                                                alt="Avatar"
                                                className="podium-avatar"
                                            />
                                            <div className="rank-badge">3</div>
                                        </div>
                                        <div className="user-name">{topThree[2].fullName}</div>
                                        <div className="user-score">
                                            {formatScore(topThree[2].value)}
                                            <span className="score-label">{getScoreLabel()}</span>
                                        </div>
                                        <div className="podium-block"></div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Rankings List */}
                        {restList.length > 0 ? (
                            <motion.div
                                className="rankings-list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                {restList.map((item, idx) => (
                                    <motion.div
                                        key={item._id}
                                        className={`ranking-item ${user?._id === item._id ? 'current-user' : ''}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="rank-number">#{item.rank}</div>
                                        <img
                                            src={item.avatar || `https://ui-avatars.com/api/?name=${item.username}`}
                                            alt="Avatar"
                                            className="user-avatar-small"
                                        />
                                        <div className="user-info">
                                            <h4>
                                                {item.fullName}
                                                {item.level && <span className="user-level">{item.level}</span>}
                                            </h4>
                                        </div>
                                        <div className="item-score">
                                            {formatScore(item.value)}
                                            <span className="score-label">{getScoreLabel()}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            restList.length === 0 && topThree.length === 0 && (
                                <div className="empty-state">No rankings available yet.</div>
                            )
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

