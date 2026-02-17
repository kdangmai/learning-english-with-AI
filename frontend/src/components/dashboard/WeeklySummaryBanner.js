import React from 'react';

const WeeklySummaryBanner = ({ weeklyReport }) => {
    if (!weeklyReport) return null;

    return (
        <>
            <div className="section-label"><span>📅</span> Hoạt động tuần này</div>
            <div className="weekly-banner">
                <div className="weekly-banner-inner">
                    <div className="weekly-item">
                        <span className="weekly-icon">📖</span>
                        <div><span className="weekly-num">{weeklyReport.vocabulary?.totalAdded || 0}</span><span className="weekly-desc">từ mới tuần này</span></div>
                    </div>
                    <div className="weekly-divider" />
                    <div className="weekly-item">
                        <span className="weekly-icon">📝</span>
                        <div><span className="weekly-num">{weeklyReport.sentences || 0}</span><span className="weekly-desc">câu luyện viết</span></div>
                    </div>
                    <div className="weekly-divider" />
                    <div className="weekly-item">
                        <span className="weekly-icon">📚</span>
                        <div><span className="weekly-num">{weeklyReport.grammar?.exercisesAttempted || 0}</span><span className="weekly-desc">bài tập ngữ pháp</span></div>
                    </div>
                    <div className="weekly-divider" />
                    <div className="weekly-item">
                        <span className="weekly-icon">✅</span>
                        <div><span className="weekly-num">{weeklyReport.grammar?.exercisesCorrect || 0}</span><span className="weekly-desc">trả lời đúng</span></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WeeklySummaryBanner;
