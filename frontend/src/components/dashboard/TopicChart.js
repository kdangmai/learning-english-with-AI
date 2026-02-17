import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import LazyRender from '../common/LazyRender';

const CustomTooltip = React.memo(({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map((entry, idx) => (
                    <p key={idx} style={{ color: entry.color }}>{entry.name}: <strong>{entry.value}</strong></p>
                ))}
            </div>
        );
    }
    return null;
});

const TopicChart = ({ heatmap }) => {
    const topicData = useMemo(() => {
        if (!heatmap) return [];
        return [...heatmap].sort((a, b) => b.total - a.total).slice(0, 8).map(t => ({
            name: t.topic.length > 14 ? t.topic.slice(0, 14) + '…' : t.topic,
            total: t.total,
            mastered: t.mastered,
            percentage: t.percentage
        }));
    }, [heatmap]);

    return (
        <div className="chart-card chart-wide">
            <div className="chart-header">
                <h2>📖 Từ Vựng Theo Chủ Đề</h2>
                <span className="chart-badge">Top {topicData.length} chủ đề</span>
            </div>
            <div className="chart-body">
                {topicData.length > 0 ? (
                    <LazyRender height={260}>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topicData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradTopicTotal" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} /><stop offset="100%" stopColor="#818cf8" stopOpacity={1} /></linearGradient>
                                    <linearGradient id="gradTopicMastered" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} /><stop offset="100%" stopColor="#4ade80" stopOpacity={1} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" name="Tổng" fill="url(#gradTopicTotal)" radius={[0, 8, 8, 0]} barSize={14} />
                                <Bar dataKey="mastered" name="Thành thạo" fill="url(#gradTopicMastered)" radius={[0, 8, 8, 0]} barSize={14} />
                                <Legend verticalAlign="top" height={30} formatter={(value) => <span style={{ color: '#475569', fontSize: '0.8rem' }}>{value}</span>} />
                            </BarChart>
                        </ResponsiveContainer>
                    </LazyRender>
                ) : (
                    <div className="chart-empty">Chưa có dữ liệu chủ đề</div>
                )}
            </div>
        </div>
    );
};

export default TopicChart;
