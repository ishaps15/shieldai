import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface PRCurveChartProps {
  data: Array<{
    recall: number;
    precision: number;
  }>;
  aucScore?: number;
}

export const PRCurveChart: React.FC<PRCurveChartProps> = ({ data, aucScore }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-charcoal-400 text-xs font-mono">
        No Precision-Recall data available.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs text-charcoal-500 font-medium">Precision vs Recall Trade-off Curve</span>
        {aucScore !== undefined && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blush-50 text-rosegold-700 border border-blush-200">
            PR-AUC: {aucScore.toFixed(3)}
          </span>
        )}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5E8E8" />
            <XAxis
              dataKey="recall"
              type="number"
              domain={[0, 1]}
              stroke="#9CA2AE"
              fontSize={10}
              tickLine={false}
              label={{ value: 'Recall', position: 'insideBottomRight', offset: -5, fill: '#9CA2AE', fontSize: 10 }}
            />
            <YAxis
              dataKey="precision"
              type="number"
              domain={[0, 1]}
              stroke="#9CA2AE"
              fontSize={10}
              tickLine={false}
              label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 25, fill: '#9CA2AE', fontSize: 10 }}
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
              formatter={(val: any) => [Number(val).toFixed(3), 'Precision']}
              labelFormatter={(label: any) => `Recall: ${Number(label).toFixed(3)}`}
            />
            <Line
              type="monotone"
              dataKey="precision"
              stroke="#B76E79"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: '#CE7E89', strokeWidth: 2, fill: '#FFFFFF' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
