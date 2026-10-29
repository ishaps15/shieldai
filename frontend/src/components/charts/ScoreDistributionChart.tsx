import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

interface ScoreDistributionChartProps {
  data: Array<{
    range: string;
    count: number;
    is_anomalous_zone: boolean;
  }>;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-charcoal-400 text-xs font-mono">
        No anomaly score distribution data available.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5E8E8" />
          <XAxis dataKey="range" stroke="#9CA2AE" fontSize={10} tickLine={false} />
          <YAxis stroke="#9CA2AE" fontSize={10} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#EADBDE',
              borderRadius: '0.75rem',
              color: '#23272F',
              fontSize: '11px',
              boxShadow: '0 4px 20px -2px rgba(183, 110, 121, 0.12)'
            }}
          />
          <Bar dataKey="count" name="Transactions" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.is_anomalous_zone ? '#E11D48' : '#B76E79'}
                fillOpacity={entry.is_anomalous_zone ? 0.85 : 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
