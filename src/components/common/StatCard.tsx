import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'rose' | 'amber' | 'emerald' | 'blue' | 'slate';
  };
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  action?: ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  action,
}) => {
  const badgeClasses = {
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[badge?.variant || 'slate'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500 tracking-tight">{title}</span>
        <div className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${badgeClasses}`}>
              {badge.text}
            </span>
          )}
        </div>

        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}

        {trend && (
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className={`font-semibold ${trend.isPositive ? 'text-emerald-600' : 'text-slate-600'}`}>
              {trend.value}
            </span>
            {trend.label && <span className="text-slate-500">{trend.label}</span>}
          </div>
        )}
      </div>

      {action && <div className="mt-4 pt-3 border-t border-slate-100">{action}</div>}
    </div>
  );
};
