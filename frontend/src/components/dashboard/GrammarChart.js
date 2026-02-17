import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import LazyRender from '../common/LazyRender';

const TENSE_SHORT = {
    'Simple Present': 'S. Present', 'Present Continuous': 'P. Cont.',
    'Present Perfect': 'P. Perfect', 'Present Perfect Continuous': 'P.P. Cont.',
    'Simple Past': 'S. Past', 'Past Continuous': 'Pa. Cont.',
    'Past Perfect': 'Pa. Perfect', 'Past Perfect Continuous': 'Pa.P. Cont.',
    'Simple Future': 'S. Future', 'Future Continuous': 'F. Cont.',
    'Future Perfect': 'F. Perfect', 'Future Perfect Continuous': 'F.P. Cont.'
};

const GrammarTooltip = React.memo(({ active, payload, label }) => {
    if (active && payload?.length) {
        const d = payload[0]?.payload;
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{d?.fullName || label}</p>
                <p style={{ color: '#6366f1' }}>Đã làm: <strong>{d?.exercisesAttempted || 0}</strong></p>
                <p style={{ color: '#22c55e' }}>Đúng: <strong>{d?.exercisesCorrect || 0}</strong></p>
                {d?.completed && <p style={{ color: '#22c55e', fontWeight: 600 }}>✅ Hoàn thành</p>}
            </div>
        );
    }
    return null;
});

const GrammarChart = ({ grammarProgress }) => {
    const grammarData = React.useMemo(() => {
        if (!grammarProgress?.data) return [];
        return grammarProgress.data.map(g => ({
            name: TENSE_SHORT[g.name] || g.name,
            fullName: g.name,
            exercisesAttempted: g.exercisesAttempted || 0,
            exercisesCorrect: g.exercisesCorrect || 0,
            completed: g.completed
        }));
    }, [grammarProgress]);

    return (
        <div className="chart-card chart-full">
            <div className="chart-header">
                <h2>📚 Tiến Độ Ngữ Pháp — 12 Thì</h2>
                <span className="chart-badge">{grammarProgress?.completed || 0} / 12 hoàn thành</span>
            </div>
            <div className="chart-body">
                <LazyRender height={320}>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={grammarData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                            <defs>
                                <linearGradient id="gradAttempted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                                </linearGradient>
                                <linearGradient id="gradCorrect" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a5b4fc" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="gradAttemptedDone" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                                </linearGradient>
                                <linearGradient id="gradCorrectDone" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} angle={-40} textAnchor="end" height={70} interval={0} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} label={{ value: 'Số bài tập', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#94a3b8' } }} />
                            <Tooltip content={<GrammarTooltip />} />
                            <Bar dataKey="exercisesAttempted" name="Đã làm" radius={[6, 6, 0, 0]} barSize={22}>
                                {grammarData.map((entry, index) => (
                                    <Cell key={index} fill={entry.completed ? 'url(#gradAttemptedDone)' : 'url(#gradAttempted)'} />
                                ))}
                            </Bar>
                            <Bar dataKey="exercisesCorrect" name="Đúng" radius={[6, 6, 0, 0]} barSize={22}>
                                {grammarData.map((entry, index) => (
                                    <Cell key={index} fill={entry.completed ? 'url(#gradCorrectDone)' : 'url(#gradCorrect)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </LazyRender>
                <div className="grammar-legend">
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)' }}></span> Đã làm (Đang học)</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}></span> Đã làm (Hoàn thành)</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #a5b4fc, #818cf8)' }}></span> Đúng (Đang học)</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}></span> Đúng (Hoàn thành)</span>
                </div>
            </div>
        </div>
    );
};

export default GrammarChart;
