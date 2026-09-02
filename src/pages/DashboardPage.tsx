import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Package,
  IndianRupee,
  AlertTriangle,
  Archive,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../services/api';
import { DashboardData, SalesAnalytics, TopProductAnalytics } from '../types';
import { formatCurrency, formatNumber, formatDate, formatRelativeTime } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RecordSaleModal } from '../components/modals/RecordSaleModal';
import { CreatePurchaseOrderModal } from '../components/modals/CreatePurchaseOrderModal';

const HEALTH_COLORS = {
  healthy: '#10b981',
  low: '#f59e0b',
  critical: '#f43f5e',
  deadStock: '#64748b',
  overstock: '#8b5cf6',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductAnalytics[]>([]);

  // Modal states for direct in-page actions
  const [recordSaleOpen, setRecordSaleOpen] = useState(false);
  const [preSelectedProductId, setPreSelectedProductId] = useState<number | undefined>(undefined);
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [poPreSupplier, setPoPreSupplier] = useState<number | undefined>(undefined);
  const [poPreItems, setPoPreItems] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    fetchDashboardData();
  }, [context?.refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, salesRes, topRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/analytics/sales?days=30'),
        api.get('/analytics/products?days=30&limit=5'),
      ]);

      if (dashRes.data?.success) setDashboard(dashRes.data.data);
      if (salesRes.data?.success) setSalesAnalytics(salesRes.data.data);
      if (topRes.data?.success) setTopProducts(topRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReorder = (item: any) => {
    setPoPreSupplier(undefined); // Modal will auto-match supplier or user selects
    setPoPreItems([
      {
        productId: item.productId,
        quantity: item.recommendedOrder,
        unitCost: item.costPrice || 50,
      },
    ]);
    setCreatePoOpen(true);
  };

  if (loading && !dashboard) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" text="Aggregating real-time retail intelligence..." />
      </div>
    );
  }

  const metrics = dashboard?.metrics;
  const healthData = dashboard?.healthDistribution
    ? [
        { name: 'Healthy Stock', value: dashboard.healthDistribution.healthy, color: HEALTH_COLORS.healthy },
        { name: 'Low Stock', value: dashboard.healthDistribution.low, color: HEALTH_COLORS.low },
        { name: 'Critical Shortage', value: dashboard.healthDistribution.critical, color: HEALTH_COLORS.critical },
        { name: 'Dead Stock', value: dashboard.healthDistribution.deadStock, color: HEALTH_COLORS.deadStock },
        { name: 'Overstock', value: dashboard.healthDistribution.overstock, color: HEALTH_COLORS.overstock },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Retail Intelligence Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated reorder point forecasting and live inventory valuation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setPreSelectedProductId(undefined);
              setRecordSaleOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Record Sale</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reorders')}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>Reorder Center</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={formatNumber(metrics?.totalProducts || 0)}
          subtitle="Active retail catalog items"
          icon={Package}
          trend={{ value: `${dashboard?.healthDistribution?.healthy || 0} Healthy`, isPositive: true }}
        />

        <StatCard
          title="Inventory Valuation"
          value={formatCurrency(metrics?.inventoryValue || 0)}
          subtitle="Total stock cost basis"
          icon={IndianRupee}
          badge={{ text: 'Live Asset', variant: 'emerald' }}
        />

        <StatCard
          title="Low & Critical Stock"
          value={formatNumber(metrics?.lowStockCount || 0)}
          subtitle={`${metrics?.criticalStockCount || 0} items at immediate risk`}
          icon={AlertTriangle}
          badge={{
            text: (metrics?.lowStockCount || 0) > 0 ? 'Needs Attention' : 'Optimal',
            variant: (metrics?.lowStockCount || 0) > 0 ? 'rose' : 'emerald',
          }}
        />

        <StatCard
          title="Dead Stock Items"
          value={formatNumber(metrics?.deadStockCount || 0)}
          subtitle="0 sales recorded in last 30 days"
          icon={Archive}
          badge={{ text: 'Tied-up capital', variant: 'slate' }}
        />
      </div>

      {/* Action Required: Urgent Reorder Notice */}
      {dashboard && dashboard.actionRequired.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50/70 via-amber-50/50 to-white rounded-2xl border border-rose-200/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500 text-white shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Action Required: {dashboard.actionRequired.length} Items Need Reordering
                </h3>
                <p className="text-xs text-slate-600">
                  Calculated using daily sales velocity, supplier lead time, and safety buffer.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/reorders')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 hover:underline cursor-pointer"
            >
              <span>View All in Reorder Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-100/40 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Product</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Avg Daily Sales</th>
                  <th className="py-2.5 px-3 text-right">Reorder Point</th>
                  <th className="py-2.5 px-3 text-right">Rec. Order</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/60 font-medium text-slate-800">
                {dashboard.actionRequired.slice(0, 5).map((item) => (
                  <tr key={item.productId} className="hover:bg-white/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {item.sku} • {item.supplierName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.currentStock} units
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {item.averageDailySales}/day
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                      {item.reorderPoint}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                      +{item.recommendedOrder} units
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleQuickReorder(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Order PO</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Visuals Grid: Sales Trend & Inventory Health Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">30-Day Sales Revenue Velocity</h3>
              <p className="text-xs text-slate-500">
                Total Revenue: {formatCurrency(salesAnalytics?.totalRevenue || 0)} ({salesAnalytics?.totalUnitsSold || 0} units sold)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600">
              Last 30 Days
            </span>
          </div>

          <div className="h-64 w-full">
            {salesAnalytics?.timeline && salesAnalytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesAnalytics.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
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
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No recent sales recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Inventory Health Donut */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Inventory Health Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution of all active catalog items</p>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {healthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} Products`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No inventory data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Products & Recent Sales Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top Selling Products</h3>
              <p className="text-xs text-slate-500">Highest sales velocity by revenue</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View Catalog
            </button>
          </div>

          <div className="space-y-3">
            {topProducts.map((p, index) => (
              <div
                key={p.productId}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.productName}</h4>
                    <p className="text-[11px] text-slate-500">
                      {p.category} • SKU: {p.sku}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{formatCurrency(p.revenue)}</p>
                  <p className="text-[11px] text-slate-500">{p.unitsSold} units sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Customer Sales</h3>
                <p className="text-xs text-slate-500">Live transactional audit log</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/sales')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Full Sales Ledger
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-100">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {dashboard?.recentSales && dashboard.recentSales.length > 0 ? (
                    dashboard.recentSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{s.productName}</div>
                          <div className="text-[10px] text-slate-400">By {s.sellerName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">{s.quantity}x</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(s.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {formatRelativeTime(s.soldAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400">
                        No recent sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* In-page Modals */}
      <RecordSaleModal
        isOpen={recordSaleOpen}
        onClose={() => setRecordSaleOpen(false)}
        onSuccess={fetchDashboardData}
        preSelectedProductId={preSelectedProductId}
      />

      <CreatePurchaseOrderModal
        isOpen={createPoOpen}
        onClose={() => setCreatePoOpen(false)}
        onSuccess={fetchDashboardData}
        preSupplierId={poPreSupplier}
        preItems={poPreItems}
      />
    </div>
  );
};
