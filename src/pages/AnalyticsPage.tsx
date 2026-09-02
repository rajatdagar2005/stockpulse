import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  ShoppingCart,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import {
  SalesAnalytics,
  CategoryAnalytics,
  TopProductAnalytics,
  InventoryHealthAnalytics,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatCard } from '../components/common/StatCard';
import { useToast } from '../context/ToastContext';

const HEALTH_COLORS = {
  healthy: '#10b981',
  low: '#f59e0b',
  critical: '#f43f5e',
  deadStock: '#64748b',
  overstock: '#8b5cf6',
};

export const AnalyticsPage: React.FC = () => {
  const { showError } = useToast();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [categories, setCategories] = useState<CategoryAnalytics[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductAnalytics[]>([]);
  const [healthStats, setHealthStats] = useState<InventoryHealthAnalytics | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [salesRes, catRes, topRes, healthRes] = await Promise.all([
        api.get(`/analytics/sales?days=${days}`),
        api.get(`/analytics/categories?days=${days}`),
        api.get(`/analytics/products?days=${days}&limit=10`),
        api.get('/analytics/health'),
      ]);

      if (salesRes.data?.success) setSalesAnalytics(salesRes.data.data);
      if (catRes.data?.success) setCategories(salesRes.data?.data ? catRes.data.data : []);
      if (topRes.data?.success) setTopProducts(topRes.data.data);
      if (healthRes.data?.success) setHealthStats(healthRes.data.data);
    } catch {
      showError('Failed to fetch analytics datasets.');
    } finally {
      setLoading(false);
    }
  };

  const healthData = healthStats?.healthBreakdown
    ? [
        { name: 'Healthy', value: healthStats.healthBreakdown.healthy, color: HEALTH_COLORS.healthy },
        { name: 'Low Stock', value: healthStats.healthBreakdown.low, color: HEALTH_COLORS.low },
        { name: 'Critical Shortage', value: healthStats.healthBreakdown.critical, color: HEALTH_COLORS.critical },
        { name: 'Dead Stock', value: healthStats.healthBreakdown.deadStock, color: HEALTH_COLORS.deadStock },
        { name: 'Overstock', value: healthStats.healthBreakdown.overstock, color: HEALTH_COLORS.overstock },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial & Sales Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Turnover velocity, category revenue contributions, and inventory valuation
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
          {[
            { label: 'Last 7 Days', value: 7 },
            { label: 'Last 30 Days', value: 30 },
            { label: 'Last 90 Days', value: 90 },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setDays(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                days === item.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !salesAnalytics ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" text="Processing analytics metrics..." />
        </div>
      ) : (
        <>
          {/* 4 Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Sales Revenue"
              value={formatCurrency(salesAnalytics?.totalRevenue || 0)}
              subtitle={`Past ${days} days sales total`}
              icon={IndianRupee}
              badge={{ text: `${days} Days`, variant: 'indigo' as any }}
            />

            <StatCard
              title="Units Sold"
              value={formatNumber(salesAnalytics?.totalUnitsSold || 0)}
              subtitle="Total individual items dispatched"
              icon={ShoppingCart}
              badge={{ text: 'Dispatched', variant: 'emerald' }}
            />

            <StatCard
              title="Average Order Value"
              value={formatCurrency(salesAnalytics?.averageOrderValue || 0)}
              subtitle="Per customer receipt average"
              icon={TrendingUp}
            />

            <StatCard
              title="Total Transactions"
              value={formatNumber(salesAnalytics?.salesCount || 0)}
              subtitle="Customer checkout volume"
              icon={Layers}
            />
          </div>

          {/* Revenue Velocity Timeline Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Revenue Velocity ({days} Days)</h3>
                <p className="text-xs text-slate-500">Daily transaction volume and revenue fluctuation</p>
              </div>
            </div>

            <div className="h-72 w-full">
              {salesAnalytics?.timeline && salesAnalytics.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesAnalytics.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevTimeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
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
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Sales Revenue']}
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
                      fill="url(#colorRevTimeline)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No sales data found for the selected timeframe.
                </div>
              )}
            </div>
          </div>

          {/* Category Revenue Bar Chart & Inventory Health Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Revenue vs Inventory Value */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Category Revenue vs Inventory Value</h3>
                  <p className="text-xs text-slate-500">Compare sales generation against stock holding capital</p>
                </div>
              </div>

              <div className="h-72 w-full">
                {categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          formatCurrency(Number(val)),
                          name === 'revenue' ? 'Sales Revenue' : 'Inventory Value',
                        ]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sales Revenue" />
                      <Bar dataKey="inventoryValue" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Inventory Value" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No category data available
                  </div>
                )}
              </div>
            </div>

            {/* Health Donut */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Portfolio Health</h3>
                <p className="text-xs text-slate-500">
                  Total Valuation: {formatCurrency(healthStats?.totalInventoryValue || 0)}
                </p>
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
                        formatter={(val, name) => [`${val} SKUs`, name]}
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
                  <div className="text-slate-400 text-sm">No health data</div>
                )}
              </div>
            </div>
          </div>

          {/* Top 10 High Velocity Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Top Performing Products (Velocity Ranking)</h3>
                <p className="text-xs text-slate-500">Top revenue contributing items over the last {days} days</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue (₹)</th>
                    <th className="py-2.5 px-3 text-right">Current Available Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {topProducts.map((p, index) => (
                    <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-700 text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.productName}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{p.sku}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">{p.unitsSold} units</td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700 text-sm">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {p.currentStock} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
