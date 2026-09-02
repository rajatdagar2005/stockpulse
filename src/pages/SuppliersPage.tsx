import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  Package,
  ClipboardList,
  Edit2,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { Supplier } from '../types';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SupplierFormModal } from '../components/modals/SupplierFormModal';
import { CreatePurchaseOrderModal } from '../components/modals/CreatePurchaseOrderModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [selectedSupplierForPO, setSelectedSupplierForPO] = useState<number | undefined>(undefined);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [context?.refreshTrigger]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      if (res.data?.success) {
        setSuppliers(res.data.data);
      }
    } catch {
      showError('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/suppliers/${supplierToDelete.id}`);
      if (res.data?.success) {
        showSuccess(`Supplier "${supplierToDelete.name}" deleted.`);
        setDeleteDialogOpen(false);
        setSupplierToDelete(null);
        fetchSuppliers();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete supplier.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers & Vendor Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage vendor lead times, ordering contacts, and purchase replenishment channels
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSupplierToEdit(null);
            setSupplierModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Supplier</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers by business name, contact person, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Supplier Grid Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Suppliers Found"
          description="Register your primary suppliers to enable lead-time tracking and automated purchase orders."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Badge & Name */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{s.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">Contact: {s.contact_name}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    <Clock className="w-3 h-3" />
                    {s.lead_time_days}d Lead
                  </span>
                </div>

                {/* Contact Information */}
                <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${s.email}`} className="text-indigo-600 hover:underline truncate">
                      {s.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.phone}</span>
                  </div>

                  {s.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-500 line-clamp-2">{s.address}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 py-3">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Products</span>
                    <span className="text-base font-bold text-slate-800">{s.product_count || 0}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active POs</span>
                    <span className="text-base font-bold text-indigo-600">{s.active_order_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSupplierForPO(s.id);
                    setPoModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Create PO</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Edit Supplier"
                    onClick={() => {
                      setSupplierToEdit(s);
                      setSupplierModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {user?.role === 'OWNER' && (
                    <button
                      type="button"
                      title="Delete Supplier"
                      onClick={() => {
                        setSupplierToDelete(s);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      <SupplierFormModal
        isOpen={supplierModalOpen}
        onClose={() => {
          setSupplierModalOpen(false);
          setSupplierToEdit(null);
        }}
        onSuccess={fetchSuppliers}
        supplierToEdit={supplierToEdit}
      />

      {/* Create PO Modal */}
      <CreatePurchaseOrderModal
        isOpen={poModalOpen}
        onClose={() => {
          setPoModalOpen(false);
          setSelectedSupplierForPO(undefined);
        }}
        onSuccess={fetchSuppliers}
        preSupplierId={selectedSupplierForPO}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSupplierToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? You can only delete suppliers with no linked products or orders.`}
        confirmLabel="Delete Supplier"
        isDestructive
        isLoading={deleting}
      />
    </div>
  );
};
