import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Calendar,
  IndianRupee,
  TrendingUp,
  User,
} from 'lucide-react';
import api from '../services/api';
import { Sale, Product } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecordSaleModal } from '../components/modals/RecordSaleModal';
import { useToast } from '../context/ToastContext';

export const SalesPage: React.FC = () => {
  const { showError } = useToast();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [saleModalOpen, setSaleModalOpen] = useState(false);

  // Aggregates
  const totalSalesRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalUnitsSold = sales.reduce((acc, s) => acc + Number(s.quantity), 0);
  const averageTicket = sales.length > 0 ? totalSalesRevenue / sales.length : 0;

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [selectedProductId, context?.refreshTrigger]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=200');
      if (res.data?.success) setProducts(res.data.data.products);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProductId) params.append('productId', selectedProductId);
      params.append('limit', '100');

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.data?.success) {
        setSales(res.data.data.sales);
      }
    } catch {
      showError('Failed to load sales records.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (sales.length === 0) {
      showError('No sales records to export.');
      return;
    }

    const headers = ['Sale ID', 'Product', 'SKU', 'Category', 'Quantity', 'Unit Price (INR)', 'Total Amount (INR)', 'Sold At', 'Recorded By'];
    const rows = sales.map((s) => [
      s.id,
      `"${(s.product_name || '').replace(/"/g, '""')}"`,
      s.product_sku || '',
      s.product_category || '',
      s.quantity,
      s.unit_price,
      s.total_amount,
      formatDate(s.sold_at, true),
      `"${(s.seller_name || 'Staff').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockPulse_Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Ledger</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time customer sales history with transactional stock reduction
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setSaleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* 3 Summary metric pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSalesRevenue)}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Units Transacted</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(totalUnitsSold)} units</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Order Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(averageTicket)}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Filter by Product
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {selectedProductId && (
          <button
            type="button"
            onClick={() => setSelectedProductId('')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            Clear Product Filter
          </button>
        )}
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No Sales Logged Yet"
            description="Record your first customer sale to automatically update inventory levels."
            action={
              <button
                type="button"
                onClick={() => setSaleModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                + Record First Sale
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sale ID</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU / Category</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Sold At</th>
                  <th className="py-3 px-4">Staff / Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">#{s.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.product_name}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="font-mono">{s.product_sku}</span> • {s.product_category}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{s.quantity}x</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(s.unit_price)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(s.sold_at, true)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{s.seller_name || 'Staff'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {sales.length} transactions</span>
          <span className="font-semibold text-slate-800">Total: {formatCurrency(totalSalesRevenue)}</span>
        </div>
      </div>

      {/* Record Sale Modal */}
      <RecordSaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={fetchSales}
      />
    </div>
  );
};
