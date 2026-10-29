import React from 'react';
import { RiskLevel, AlertStatus } from '../../types';

interface BadgeProps {
  type: 'risk' | 'status' | 'general';
  value: RiskLevel | AlertStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, size = 'sm', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  if (type === 'risk') {
    const risk = (value as string).toLowerCase();
    switch (risk) {
      case 'critical':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-mono font-bold tracking-wider rounded-full bg-rose-50 text-rose-800 border border-rose-300 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse shadow-[0_0_6px_rgba(225,29,72,0.6)]" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-mono font-bold tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-mono font-bold tracking-wider rounded-full bg-blush-50 text-blush-800 border border-blush-300 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rosegold-500 mr-1.5" />
            MEDIUM
          </span>
        );
      case 'low':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-mono font-semibold tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
            LOW
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-mono font-medium tracking-wider rounded-full bg-charcoal-50 text-charcoal-600 border border-charcoal-200 ${className}`}>
            NORMAL
          </span>
        );
    }
  }

  if (type === 'status') {
    switch (value) {
      case 'New':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-rose-50 text-rosegold-700 border border-rose-200 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rosegold-500 mr-1.5 animate-ping" />
            New
          </span>
        );
      case 'Under Review':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            Under Review
          </span>
        );
      case 'Escalated':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-purple-50 text-purple-800 border border-purple-200 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />
            Escalated
          </span>
        );
      case 'Resolved':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Resolved
          </span>
        );
      case 'False Positive':
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-charcoal-50 text-charcoal-600 border border-charcoal-200 shadow-sm ${className}`}>
            False Positive
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-charcoal-50 text-charcoal-700 border border-charcoal-200 ${className}`}>
            {value}
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-blush-50 text-charcoal-700 border border-blush-200 ${className}`}>
      {value}
    </span>
  );
};
