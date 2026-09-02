import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Eye,
  Check,
  XCircle,
  PackageCheck,
  Send,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import { PurchaseOrder, PurchaseOrderStatus } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CreatePurchaseOrderModal } from '../components/modals/CreatePurchaseOrderModal';
import { useToast } from '../context/ToastContext';

export const PurchaseOrdersPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const context = useOutletContext<{ refreshTrigger?: number; handleActionSuccess?: () => void }>();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status change dialog
  const [statusAction, setStatusAction] = useState<{
    order: PurchaseOrder;
    newStatus: PurchaseOrderStatus;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, context?.refreshTrigger]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '100');

      const res = await api.get(`/purchase-orders?${params.toString()}`);
      if (res.data?.success) {
        setOrders(res.data.data.orders);
      }
    } catch {
      showError('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId: number) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const res = await api.get(`/purchase-orders/${orderId}`);
      if (res.data?.success) {
        setSelectedOrder(res.data.data);
      }
    } catch {
      showError('Failed to fetch order details.');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusAction) return;

    try {
      setUpdatingStatus(true);
      const res = await api.patch(`/purchase-orders/${statusAction.order.id}/status`, {
        status: statusAction.newStatus,
      });

      if (res.data?.success) {
        showSuccess(res.data.message || `Purchase Order status updated to ${statusAction.newStatus}.`);
        setStatusAction(null);
        fetchOrders();
        if (context?.handleActionSuccess) {
          context.handleActionSuccess();
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders (PO)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Issue supplier replenishment orders and receive goods to atomically replenish stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreatePoOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { label: 'All Orders', value: '' },
          { label: 'Pending / Draft', value: 'PENDING' },
          { label: 'Ordered', value: 'ORDERED' },
          { label: 'Received (Stock In)', value: 'RECEIVED' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} columns={7} />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No Purchase Orders Found"
            description="Create a purchase order to replenish low-stock products from your suppliers."
            action={
              <button
                type="button"
                onClick={() => setCreatePoOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                + Create First PO
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ordered Date</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        onClick={() => handleViewDetails(po.id)}
                        className="font-mono font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                      >
                        {po.order_number}
                      </div>
                      <div className="text-[10px] text-slate-400">ID #{po.id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{po.supplier_name}</div>
                    </td>

                    <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                      {po.item_count || 1} line item(s)
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(po.total_amount)}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={po.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-slate-600">{formatDate(po.ordered_at)}</td>

                    <td className="py-3 px-4 text-slate-600">
                      {po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => handleViewDetails(po.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Transitions */}
                        {po.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => setStatusAction({ order: po, newStatus: 'ORDERED' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Mark Ordered</span>
                          </button>
                        )}

                        {po.status === 'ORDERED' && (
                          <button
                            type="button"
                            onClick={() => setStatusAction({ order: po, newStatus: 'RECEIVED' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive Stock</span>
                          </button>
                        )}

                        {(po.status === 'PENDING' || po.status === 'ORDERED') && (
                          <button
                            type="button"
                            onClick={() => setStatusAction({ order: po, newStatus: 'CANCELLED' })}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PO Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        title={`Purchase Order: ${selectedOrder?.order_number || ''}`}
        subtitle="Complete order items and dispatch details"
        maxWidth="lg"
      >
        {detailLoading || !selectedOrder ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="md" text="Loading PO details..." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <StatusBadge status={selectedOrder.status} size="sm" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Supplier</span>
                <span className="font-bold text-slate-800">{selectedOrder.supplier_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Ordered At</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedOrder.ordered_at)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Expected Date</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedOrder.expected_delivery_date)}
                </span>
              </div>
            </div>

            {/* Items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.product_sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">{item.quantity} units</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Purchase Order Amount:</span>
                <span className="text-base font-bold">{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {selectedOrder.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      setStatusAction({ order: selectedOrder, newStatus: 'ORDERED' });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mark Ordered</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      setStatusAction({ order: selectedOrder, newStatus: 'RECEIVED' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Receive Stock & Replenish</span>
                  </button>
                </>
              )}

              {selectedOrder.status === 'ORDERED' && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setStatusAction({ order: selectedOrder, newStatus: 'RECEIVED' });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Receive Stock & Replenish</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create PO Modal */}
      <CreatePurchaseOrderModal
        isOpen={createPoOpen}
        onClose={() => setCreatePoOpen(false)}
        onSuccess={fetchOrders}
      />

      {/* Confirm Status Change Dialog */}
      <ConfirmDialog
        isOpen={!!statusAction}
        onClose={() => setStatusAction(null)}
        onConfirm={handleConfirmStatusChange}
        title={
          statusAction?.newStatus === 'RECEIVED'
            ? 'Receive Goods & Replenish Stock'
            : statusAction?.newStatus === 'CANCELLED'
            ? 'Cancel Purchase Order'
            : 'Update Purchase Order Status'
        }
        message={
          statusAction?.newStatus === 'RECEIVED'
            ? `Confirm receipt for ${statusAction?.order.order_number}? This will ATOMICALLY increase current inventory stock for all products in this order in PostgreSQL.`
            : statusAction?.newStatus === 'CANCELLED'
            ? `Are you sure you want to cancel order ${statusAction?.order.order_number}?`
            : `Update status of ${statusAction?.order.order_number} to ${statusAction?.newStatus}?`
        }
        confirmLabel={statusAction?.newStatus === 'RECEIVED' ? 'Confirm & Replenish Stock' : 'Confirm Update'}
        isDestructive={statusAction?.newStatus === 'CANCELLED'}
        isLoading={updatingStatus}
      />
    </div>
  );
};
