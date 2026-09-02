import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text,
}) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
      <Loader2 className={`${sizeClass} animate-spin text-slate-700`} />
      {text && <p className="text-sm font-medium">{text}</p>}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="w-full animate-pulse divide-y divide-slate-100">
      <div className="h-10 bg-slate-100 rounded-t-lg mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="py-3.5 flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-100 rounded-md"
              style={{ width: `${Math.max(40, (100 / columns) - 5)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
