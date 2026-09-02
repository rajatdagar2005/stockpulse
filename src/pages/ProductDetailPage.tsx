import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  Edit2,
  Truck,
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { Product } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RecordSaleModal } from '../components/modals/RecordSaleModal';
import { ProductFormModal } from '../components/modals/ProductFormModal';
import { CreatePurchaseOrderModal } from '../components/modals/CreatePurchaseOrderModal';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [salesTimeline, setSalesTimeline] = useState<any[]>([]);

  // Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetail();
    }
  }, [id, context?.refreshTrigger]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        setProduct(res.data.data.product);
        setSalesTimeline(res.data.data.salesTimeline || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !product) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" text="Loading product profile & forecasting..." />
      </div>
    );
  }

  const marginAmount = product.unit_price - product.cost_price;
  const marginPercent = product.unit_price > 0 ? ((marginAmount / product.unit_price) * 100).toFixed(1) : '0';

  // Calculate Intelligence metrics
  const ads = product.average_daily_sales || 0;
  const rop = product.reorder_point || 0;
  const recOrder = product.recommended_order || 0;
  const leadTime = product.supplier_lead_time || 3;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
              <StatusBadge status={product.status || 'HEALTHY'} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: <span className="font-mono font-semibold text-slate-700">{product.sku}</span> • Category:{' '}
              <span className="font-medium text-slate-700">{product.category}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSaleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Record Sale</span>
          </button>

          <button
            type="button"
            onClick={() => setPoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            <span>Order Replenishment</span>
          </button>

          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* 4 Financial & Inventory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-3xl font-bold ${
                product.current_stock <= product.safety_stock ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {product.current_stock}
            </span>
            <span className="text-xs text-slate-500">units available</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Safety Buffer: <span className="font-semibold text-slate-700">{product.safety_stock} units</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pricing & Margin</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(product.unit_price)}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {marginPercent}% Margin
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Cost Price: <span className="font-semibold text-slate-700">{formatCurrency(product.cost_price)}</span> (Profit: +{formatCurrency(marginAmount)})
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Valuation</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(product.current_stock * product.cost_price)}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Potential Revenue: <span className="font-semibold text-slate-700">{formatCurrency(product.current_stock * product.unit_price)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Supplier</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-bold text-slate-900 truncate">
              {product.supplier_name || 'Unassigned'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Lead Time: <strong className="text-slate-700">{leadTime} days</strong></span>
          </div>
        </div>
      </div>

      {/* StockPulse Intelligence & Recommendation Engine Box */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>StockPulse Intelligence Forecast</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-400">30-Day Sales Velocity (ADS)</p>
            <p className="text-2xl font-bold mt-1 text-white">{ads} <span className="text-xs font-normal text-slate-400">units/day</span></p>
            <p className="text-[11px] text-slate-400 mt-1">Total {product.sales_last_30_days || 0} units sold in past 30d</p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Calculated Reorder Point (ROP)</p>
            <p className="text-2xl font-bold mt-1 text-amber-300">{rop} <span className="text-xs font-normal text-slate-400">units</span></p>
            <p className="text-[11px] text-slate-400 mt-1">({ads} × {leadTime}d lead) + {product.safety_stock} safety</p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Recommended Order Quantity</p>
            <p className="text-2xl font-bold mt-1 text-emerald-300">{recOrder > 0 ? `+${recOrder}` : '0'} <span className="text-xs font-normal text-slate-400">units</span></p>
            <p className="text-[11px] text-slate-400 mt-1">
              {recOrder > 0 ? `Cost: ~${formatCurrency(recOrder * product.cost_price)}` : 'Stock level is sufficient'}
            </p>
          </div>

          <div className="flex flex-col justify-center">
            {recOrder > 0 ? (
              <button
                type="button"
                onClick={() => setPoModalOpen(true)}
                className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>Create PO for +{recOrder} units</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-emerald-400 font-semibold">Stock is in Healthy Range</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 30-Day Sales Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">30-Day Sales Velocity Timeline</h3>
            <p className="text-xs text-slate-500">Historical demand pattern for this product</p>
          </div>
        </div>

        <div className="h-64 w-full">
          {salesTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProdRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === 'revenue' ? formatCurrency(Number(val)) : `${val} units`,
                    name === 'revenue' ? 'Revenue' : 'Units Sold',
                  ]}
                  labelFormatter={(label) => formatDate(String(label))}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="units"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProdRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No sales logged for this product in the last 30 days.
            </div>
          )}
        </div>
      </div>

      {/* Description / Additional details */}
      {product.description && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Product Description & Notes</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Modals */}
      <RecordSaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={fetchProductDetail}
        preSelectedProductId={product.id}
      />

      <ProductFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={fetchProductDetail}
        productToEdit={product}
      />

      <CreatePurchaseOrderModal
        isOpen={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        onSuccess={fetchProductDetail}
        preSupplierId={product.supplier_id}
        preItems={[
          {
            productId: product.id,
            quantity: recOrder > 0 ? recOrder : 20,
            unitCost: product.cost_price,
          },
        ]}
      />
    </div>
  );
};
