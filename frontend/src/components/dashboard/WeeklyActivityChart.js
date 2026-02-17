import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import LazyRender from '../common/LazyRender';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

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

const WeeklyActivityChart = ({ sessionStats }) => {
    const weeklyData = useMemo(() => {
        if (!sessionStats?.weeklyData) return [];
        const now = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const dayLabel = `${DAY_LABELS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
            const found = sessionStats.weeklyData.find(w => w._id === key);
            days.push({
                name: dayLabel,
                date: key,
                submitted: found?.submitted || 0,
                avgScore: found?.avgScore ? Math.round(found.avgScore * 10) / 10 : 0
            });
        }
        return days;
    }, [sessionStats]);

    return (
        <div className="chart-card chart-wide">
            <div className="chart-header">
                <h2>📈 Hoạt Động 7 Ngày Gần Đây</h2>
                <span className="chart-badge">Tuần này</span>
            </div>
            <div className="chart-body">
                {weeklyData.length > 0 ? (
                    <LazyRender height={260}>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                                        <stop offset="50%" stopColor="#818cf8" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="strokeSubmitted" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="submitted" name="Câu đã nộp" stroke="url(#strokeSubmitted)" strokeWidth={3} fill="url(#colorSubmitted)" dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2.5 }} activeDot={{ r: 8, fill: '#6366f1', stroke: '#c7d2fe', strokeWidth: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </LazyRender>
                ) : (
                    <div className="chart-empty">Chưa có dữ liệu tuần này</div>
                )}
            </div>
        </div>
    );
};

export default WeeklyActivityChart;
