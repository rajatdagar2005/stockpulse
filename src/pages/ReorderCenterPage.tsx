import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  RefreshCw,
  AlertTriangle,
  Package,
  Truck,
  Plus,
  Info,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { ReorderRecommendation } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { CreatePurchaseOrderModal } from '../components/modals/CreatePurchaseOrderModal';
import { useToast } from '../context/ToastContext';

export const ReorderCenterPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);

  // Filter & tab
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'LOW'>('ALL');

  // Purchase Order modal trigger
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState<number | undefined>(undefined);
  const [poItems, setPoItems] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    fetchRecommendations();
  }, [context?.refreshTrigger]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reorders');
      if (res.data?.success) {
        setRecommendations(res.data.data);
      }
    } catch {
      showError('Failed to calculate reorder recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSingle = (item: ReorderRecommendation) => {
    setPoSupplierId(item.supplier_id);
    setPoItems([
      {
        productId: item.product_id,
        quantity: item.recommended_order,
        unitCost: item.cost_price,
      },
    ]);
    setPoModalOpen(true);
  };

  const filteredItems = recommendations.filter((item) => {
    if (statusFilter === 'CRITICAL') return item.status === 'CRITICAL';
    if (statusFilter === 'LOW') return item.status === 'LOW' || item.status === 'CRITICAL';
    return true;
  });

  const criticalCount = recommendations.filter((r) => r.status === 'CRITICAL').length;
  const lowCount = recommendations.filter((r) => r.status === 'LOW').length;
  const totalEstimatedReorderCost = recommendations.reduce(
    (acc, r) => acc + (r.recommended_order * r.cost_price),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reorder Intelligence Center</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated purchase order recommendations based on sales velocity and lead-time safety buffers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPoSupplierId(undefined);
            setPoItems(undefined);
            setPoModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Blank PO</span>
        </button>
      </div>

      {/* Reorder Formula Info Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 text-slate-200 shadow-md">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Decision Support Logic & Mathematical Model</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="font-bold text-white block mb-1">1. Daily Velocity (ADS)</span>
            <p className="text-slate-400">Total units sold in the past 30 days ÷ 30 days.</p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="font-bold text-white block mb-1">2. Reorder Point (ROP)</span>
            <p className="text-slate-400">ROP = (ADS × Supplier Lead Time Days) + Safety Buffer Stock.</p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="font-bold text-white block mb-1">3. Recommended Order</span>
            <p className="text-slate-400">Target Stock = ROP + (ADS × 14d review). Order = Target − Current Stock.</p>
          </div>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Shortages</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-rose-600">{criticalCount}</span>
            <span className="text-xs text-slate-500">at risk of stockout within 48h</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Below Reorder Point</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-amber-600">{lowCount + criticalCount}</span>
            <span className="text-xs text-slate-500">total products needing orders</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recommended PO Value</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalEstimatedReorderCost)}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Recommendations ({recommendations.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CRITICAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            statusFilter === 'CRITICAL'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          Critical Only ({criticalCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('LOW')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            statusFilter === 'LOW'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          Critical + Low ({criticalCount + lowCount})
        </button>
      </div>

      {/* Recommendations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All Stock Levels Are Healthy"
            description="No items have breached their calculated reorder threshold based on current sales velocity."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Avg Velocity</th>
                  <th className="py-3 px-4 text-right">Reorder Point</th>
                  <th className="py-3 px-4 text-right">Rec. Order</th>
                  <th className="py-3 px-4 text-right">Est. Cost (₹)</th>
                  <th className="py-3 px-4">Supplier & Lead Time</th>
                  <th className="py-3 px-4">Reason & Decision</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredItems.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.sku}</div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold text-sm ${
                          item.current_stock <= item.safety_stock ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {item.current_stock}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right text-slate-600">
                      {item.average_daily_sales} / day
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {item.reorder_point}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-indigo-600 text-sm">
                      +{item.recommended_order} units
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(item.recommended_order * item.cost_price)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-semibold">{item.supplier_name}</div>
                      <div className="text-[10px] text-slate-500">{item.lead_time_days} days lead time</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2" title={item.reason}>
                        {item.reason}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOrderSingle(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Order PO</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PO Modal */}
      <CreatePurchaseOrderModal
        isOpen={poModalOpen}
        onClose={() => {
          setPoModalOpen(false);
          setPoSupplierId(undefined);
          setPoItems(undefined);
        }}
        onSuccess={fetchRecommendations}
        preSupplierId={poSupplierId}
        preItems={poItems}
      />
    </div>
  );
};
