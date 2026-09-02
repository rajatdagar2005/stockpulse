import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ShoppingCart,
  Download,
  Upload,
} from 'lucide-react';
import api from '../services/api';
import { Product } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ProductFormModal } from '../components/modals/ProductFormModal';
import { RecordSaleModal } from '../components/modals/RecordSaleModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_GROUPS, ALL_CATEGORIES } from '../constants/categories';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Actions
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleProductId, setSaleProductId] = useState<number | undefined>(undefined);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedStatus, context?.refreshTrigger]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data?.success) setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('limit', '200');

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data?.success) {
        setProducts(res.data.data.products);
      }
    } catch {
      showError('Failed to load products list.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/products/${productToDelete.id}`);
      if (res.data?.success) {
        showSuccess(`Product "${productToDelete.name}" deleted.`);
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        fetchProducts();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      showError('No products to export.');
      return;
    }

    const headers = ['SKU', 'Name', 'Category', 'Current Stock', 'Safety Stock', 'Cost Price', 'Retail Price', 'Status', 'Supplier'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.current_stock,
      p.safety_stock,
      p.cost_price,
      p.unit_price,
      p.status || 'HEALTHY',
      `"${(p.supplier_name || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockPulse_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage inventory items, pricing margins, safety stock, and supplier assignments
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
            onClick={() => {
              setProductToEdit(null);
              setProductFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories ({products.length})</option>
            {CATEGORY_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Stock Statuses</option>
            <option value="CRITICAL">Critical Shortage</option>
            <option value="LOW">Low Stock</option>
            <option value="HEALTHY">Healthy</option>
            <option value="OVERSTOCK">Overstock</option>
            <option value="DEAD_STOCK">Dead Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Products Found"
            description="No items match the current search filters or category criteria."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedStatus('');
                }}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Safety Buffer</th>
                  <th className="py-3 px-4 text-right">Cost (₹)</th>
                  <th className="py-3 px-4 text-right">Retail (₹)</th>
                  <th className="py-3 px-4 text-right">Gross Margin</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {products.map((p) => {
                  const marginPercent = p.unit_price > 0 ? (((p.unit_price - p.cost_price) / p.unit_price) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div
                          onClick={() => navigate(`/products/${p.id}`)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.sku}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold text-sm ${
                            p.current_stock <= p.safety_stock ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {p.current_stock}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-500">{p.safety_stock} units</td>

                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(p.cost_price)}</td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.unit_price)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            parseFloat(marginPercent) >= 25 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {marginPercent}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">{p.supplier_name || '—'}</td>

                      <td className="py-3 px-4">
                        <StatusBadge status={p.status || 'HEALTHY'} size="sm" />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Quick Sale"
                            onClick={() => {
                              setSaleProductId(p.id);
                              setSaleModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            title="View Analytics"
                            onClick={() => navigate(`/products/${p.id}`)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setProductToEdit(p);
                              setProductFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {user?.role === 'OWNER' && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => {
                                setProductToDelete(p);
                                setDeleteDialogOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {products.length} products</span>
          <span className="font-medium text-slate-700">
            Total Inventory Valuation: {formatCurrency(products.reduce((acc, p) => acc + p.current_stock * p.cost_price, 0))}
          </span>
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={productFormOpen}
        onClose={() => {
          setProductFormOpen(false);
          setProductToEdit(null);
        }}
        onSuccess={fetchProducts}
        productToEdit={productToEdit}
      />

      <RecordSaleModal
        isOpen={saleModalOpen}
        onClose={() => {
          setSaleModalOpen(false);
          setSaleProductId(undefined);
        }}
        onSuccess={fetchProducts}
        preSelectedProductId={saleProductId}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.name}" (${productToDelete?.sku})? This cannot be undone if product has no historical sales.`}
        confirmLabel="Delete Product"
        isDestructive
        isLoading={deleting}
      />
    </div>
  );
};
