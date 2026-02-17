import React from 'react';
import { useNavigate } from 'react-router-dom';

const SrsReviewWidget = ({ srsStats }) => {
    const navigate = useNavigate();

    if (!srsStats) return null;

    return (
        <div className="srs-review-widget" onClick={() => navigate('/vocabulary')}>
            <div className="srs-widget-left">
                <h3>🔄 Ôn Tập Từ Vựng</h3>
                <p className="srs-widget-desc">Hệ thống Spaced Repetition giúp bạn ghi nhớ từ lâu dài</p>
            </div>
            <div className="srs-widget-stats">
                <div className="srs-widget-stat due">
                    <span className="srs-w-num">{srsStats.dueCount}</span>
                    <span className="srs-w-label">Cần ôn tập</span>
                </div>
                <div className="srs-widget-stat">
                    <span className="srs-w-num">{srsStats.learningCount}</span>
                    <span className="srs-w-label">Đang học</span>
                </div>
                <div className="srs-widget-stat">
                    <span className="srs-w-num">{srsStats.knownCount}</span>
                    <span className="srs-w-label">Đã biết</span>
                </div>
                <div className="srs-widget-stat mastered">
                    <span className="srs-w-num">{srsStats.masteredCount}</span>
                    <span className="srs-w-label">Thành thạo</span>
                </div>
            </div>
            <div className="srs-widget-action">
                <span className="srs-action-btn">Ôn tập ngay →</span>
            </div>
        </div>
    );
};

export default SrsReviewWidget;
