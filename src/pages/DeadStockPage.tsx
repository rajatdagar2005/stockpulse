import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Archive,
  AlertOctagon,
  IndianRupee,
  ShoppingCart,
  TrendingDown,
  Tag,
  ArrowRight,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { DeadStockItem } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecordSaleModal } from '../components/modals/RecordSaleModal';
import { useToast } from '../context/ToastContext';

export const DeadStockPage: React.FC = () => {
  const { showError } = useToast();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DeadStockItem[]>([]);
  const [totalTiedUpValue, setTotalTiedUpValue] = useState<number>(0);

  // Clearance sale modal
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [clearanceProductId, setClearanceProductId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchDeadStock();
  }, [context?.refreshTrigger]);

  const fetchDeadStock = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reorders/dead-stock');
      if (res.data?.success) {
        setItems(res.data.data.items);
        setTotalTiedUpValue(res.data.data.totalTiedUpValue || 0);
      }
    } catch {
      showError('Failed to fetch dead stock analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearanceSale = (productId: number) => {
    setClearanceProductId(productId);
    setSaleModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dead & Slow-Moving Stock</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              0 Sales in 30 Days
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Identify stagnant inventory locking up retail working capital and take liquidation action
          </p>
        </div>
      </div>

      {/* Trapped Capital Alert Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-xs">
            <AlertOctagon className="w-8 h-8 text-white" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-orange-100">
              Total Trapped Retail Capital
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-0.5">
              {formatCurrency(totalTiedUpValue)}
            </h2>
            <p className="text-xs text-orange-100 mt-1">
              Locked inside {items.length} stagnant SKUs with 0 sales velocity over the last 30 days.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-xs text-center border border-white/20">
            <span className="text-xs text-orange-100 block">Stagnant SKUs</span>
            <span className="text-xl font-bold">{items.length}</span>
          </div>
        </div>
      </div>

      {/* Suggested Liquidation Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Tag className="w-3.5 h-3.5" />
            <span>1. Flash Discount (20-30%)</span>
          </div>
          <p className="text-xs text-slate-500">
            Apply markdown pricing to recover cost capital and free up shelf space for high-velocity items.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>2. Bundle with Top Sellers</span>
          </div>
          <p className="text-xs text-slate-500">
            Pair slow-moving accessories or snacks with high-demand staple products as a promotional combo.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>3. Supplier Buyback / Return</span>
          </div>
          <p className="text-xs text-slate-500">
            Check supplier agreements for credit notes or return arrangements on unsold non-perishable goods.
          </p>
        </div>
      </div>

      {/* Dead Stock Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={7} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="No Dead Stock Detected"
            description="Great news! All products in your inventory have recorded customer sales in the past 30 days."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Trapped Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Retail Price</th>
                  <th className="py-3 px-4 text-right">Tied-Up Valuation</th>
                  <th className="py-3 px-4">Last Sale</th>
                  <th className="py-3 px-4 text-right">Liquidation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.map((item) => (
                  <tr key={item.product_id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.sku}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {item.current_stock} units
                    </td>

                    <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.cost_price)}</td>

                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {formatCurrency(item.unit_price)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                      {formatCurrency(item.inventory_value)}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {item.last_sold_at ? (
                        <div>
                          <div>{formatDate(item.last_sold_at)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            ({item.days_since_last_sale} days ago)
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No sales recorded</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleClearanceSale(item.product_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Discount Sale</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>{items.length} stagnant inventory items</span>
          <span className="font-bold text-orange-700">
            Total Capital Locked: {formatCurrency(totalTiedUpValue)}
          </span>
        </div>
      </div>

      {/* Sale modal */}
      <RecordSaleModal
        isOpen={saleModalOpen}
        onClose={() => {
          setSaleModalOpen(false);
          setClearanceProductId(undefined);
        }}
        onSuccess={fetchDeadStock}
        preSelectedProductId={clearanceProductId}
      />
    </div>
  );
};
