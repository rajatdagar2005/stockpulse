import React from 'react';
import { ProductStatus, PurchaseOrderStatus } from '../../types';

interface StatusBadgeProps {
  status: ProductStatus | PurchaseOrderStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let config = {
    label: status,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  };

  switch (status) {
    case 'CRITICAL':
      config = {
        label: 'Critical Shortage',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500 animate-pulse',
      };
      break;
    case 'LOW':
      config = {
        label: 'Low Stock',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
      break;
    case 'HEALTHY':
      config = {
        label: 'Healthy',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
      break;
    case 'DEAD_STOCK':
      config = {
        label: 'Dead Stock',
        classes: 'bg-orange-50 text-orange-800 border-orange-200',
        dot: 'bg-orange-500',
      };
      break;
    case 'OVERSTOCK':
      config = {
        label: 'Overstock',
        classes: 'bg-purple-50 text-purple-800 border-purple-200',
        dot: 'bg-purple-500',
      };
      break;
    // Purchase order statuses
    case 'PENDING':
      config = {
        label: 'Draft / Pending',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
      break;
    case 'ORDERED':
      config = {
        label: 'Ordered',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      };
      break;
    case 'RECEIVED':
      config = {
        label: 'Received',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
      break;
    case 'CANCELLED':
      config = {
        label: 'Cancelled',
        classes: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border whitespace-nowrap ${sizeClasses} ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
