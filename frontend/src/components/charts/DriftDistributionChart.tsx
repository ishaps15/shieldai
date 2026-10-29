import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { FeatureDriftMetric } from '../../types';

interface DriftDistributionChartProps {
  metrics: Record<string, FeatureDriftMetric>;
}

export const DriftDistributionChart: React.FC<DriftDistributionChartProps> = ({ metrics }) => {
  const chartData = Object.entries(metrics).map(([feature, data]) => ({
    feature: feature.replace(/_/g, ' '),
    psi: data.psi,
    status: data.status,
    pct_change: data.mean_pct_change,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-charcoal-400 text-xs font-mono">
        No feature drift metrics recorded yet. Run drift analysis to generate stability measures.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F5E8E8" />
          <XAxis type="number" stroke="#9CA2AE" fontSize={10} domain={[0, 'auto']} />
          <YAxis
            type="category"
            dataKey="feature"
            stroke="#9CA2AE"
            fontSize={10}
            tickLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#EADBDE',
              borderRadius: '0.75rem',
              color: '#23272F',
              fontSize: '11px',
              boxShadow: '0 4px 20px -2px rgba(183, 110, 121, 0.12)'
            }}
            formatter={(val: any, name: any, item: any) => [
              `PSI: ${Number(val).toFixed(3)} (${item.payload.status}) | Δ Mean: ${item.payload.pct_change}%`,
              'Drift'
            ]}
          />
          <ReferenceLine x={0.1} stroke="#D97706" strokeDasharray="3 3" label={{ value: 'Warn (0.1)', fill: '#D97706', fontSize: 10 }} />
          <ReferenceLine x={0.25} stroke="#E11D48" strokeDasharray="3 3" label={{ value: 'Drift (0.25)', fill: '#E11D48', fontSize: 10 }} />
          <Bar dataKey="psi" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, index) => {
              const color =
                entry.psi >= 0.25
                  ? '#E11D48'
                  : entry.psi >= 0.10
                  ? '#D97706'
                  : '#10B981';
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
