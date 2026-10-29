import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface VolumeTrendChartProps {
  data: Array<{
    date: string;
    total_transactions: number;
    total_amount: number;
    anomalies: number;
  }>;
}

export const VolumeTrendChart: React.FC<VolumeTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-charcoal-400 text-xs font-mono">
        No volume time-series data available.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B76E79" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#B76E79" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorAnom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E11D48" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5E8E8" />
          <XAxis
            dataKey="date"
            stroke="#9CA2AE"
            fontSize={10}
            tickLine={false}
            tickFormatter={(val) => val.slice(5)}
          />
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
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Area
            type="monotone"
            dataKey="total_transactions"
            name="Total Volume"
            stroke="#B76E79"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
          <Area
            type="monotone"
            dataKey="anomalies"
            name="Anomalies Flagged"
            stroke="#E11D48"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAnom)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
