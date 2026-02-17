import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import LazyRender from '../common/LazyRender';

const STATUS_COLORS = {
    mastered: '#22c55e',
    known: '#6366f1',
    learning: '#f59e0b',
    unknown: '#94a3b8'
};
const STATUS_LABELS = {
    mastered: 'Thành thạo',
    known: 'Đã biết',
    learning: 'Đang học',
    unknown: 'Chưa biết'
};

const VocabStatusChart = ({ vocabStats, overview }) => {
    const vocabPieData = useMemo(() => {
        if (!vocabStats?.statusChart) return [];
        return vocabStats.statusChart.map(item => ({
            name: STATUS_LABELS[item.name] || item.name,
            value: item.value,
            color: STATUS_COLORS[item.name] || '#94a3b8'
        }));
    }, [vocabStats]);

    const vocabTotal = useMemo(() => vocabPieData.reduce((s, d) => s + d.value, 0), [vocabPieData]);

    return (
        <div className="chart-card">
            <div className="chart-header"><h2>🎯 Trạng Thái Từ Vựng</h2></div>
            <div className="chart-body">
                {vocabPieData.length > 0 ? (
                    <LazyRender height={300}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={vocabPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={52}
                                    outerRadius={82}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="rgba(255,255,255,0.6)"
                                    strokeWidth={2}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                >
                                    {vocabPieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                                </Pie>
                                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" className="pie-center-value">{vocabTotal}</text>
                                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="pie-center-label">từ vựng</text>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: '#475569', fontSize: '0.78rem' }}>{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </LazyRender>
                ) : (
                    <div className="chart-empty">Chưa có dữ liệu từ vựng</div>
                )}
            </div>
        </div>
    );
};

export default VocabStatusChart;
