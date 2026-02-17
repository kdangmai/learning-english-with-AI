import React from 'react';
import './Skeleton.css';

const DashboardSkeleton = () => {
    return (
        <div className="dashboard">
            <div className="dashboard-hero skeleton" style={{ height: '200px', marginBottom: '30px' }}></div>

            <div className="quick-actions" style={{ marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '16px' }}></div>
                ))}
            </div>

            <div className="stats-grid" style={{ marginBottom: '30px' }}>
                <div className="skeleton-stat skeleton"></div>
                <div className="skeleton-stat skeleton"></div>
                <div className="skeleton-stat skeleton"></div>
                <div className="skeleton-stat skeleton"></div>
            </div>

            <div className="charts-grid">
                <div className="skeleton-chart skeleton" style={{ gridColumn: 'span 2' }}></div>
                <div className="skeleton-chart skeleton"></div>
                <div className="skeleton-chart skeleton"></div>
            </div>
        </div>
    );
};

export default DashboardSkeleton;
