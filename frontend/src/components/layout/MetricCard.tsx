import React from 'react';
import { Tooltip } from '../common/Tooltip';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  tooltip?: string;
  statusColor?: 'emerald' | 'amber' | 'red' | 'blue' | 'slate';
  accentBorder?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  tooltip,
  statusColor = 'blue',
  accentBorder = false,
}) => {
  const iconThemes = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-rose-700 bg-rose-50 border-rose-200',
    blue: 'text-rosegold-700 bg-blush-50 border-blush-200',
    slate: 'text-charcoal-700 bg-charcoal-50 border-charcoal-200',
  };

  const borderStyles = accentBorder
    ? 'border-rosegold-400 shadow-soft'
    : 'border-[#F2E5E6] hover:border-rosegold-300';

  return (
    <div className={`bg-white border ${borderStyles} rounded-2xl p-5 shadow-soft hover:shadow-card transition-all duration-300 relative overflow-hidden group`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-charcoal-500">
            {title}
          </span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <div className={`p-2.5 rounded-xl border ${iconThemes[statusColor]} shrink-0 transition-transform group-hover:scale-105 shadow-sm`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-mono font-bold tracking-tight text-charcoal-900">{value}</span>
        {trend && (
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
              trend.isNeutral
                ? 'bg-charcoal-50 text-charcoal-600 border border-charcoal-200'
                : trend.isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-charcoal-500 font-medium">{subtitle}</p>}
    </div>
  );
};
