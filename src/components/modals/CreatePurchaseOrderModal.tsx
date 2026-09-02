import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Product, Supplier } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Plus,
  Trash2,
  ClipboardList,
  Calendar,
  AlertCircle,
  Package,
  Truck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';
import { SupplierFormModal } from './SupplierFormModal';

interface PreFilledItem {
  productId: number;
  quantity: number;
  unitCost?: number;
}

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preSupplierId?: number;
  preItems?: PreFilledItem[];
}

interface OrderItemRow {
  productId: number;
  quantity: number;
  unitCost: number;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSupplierId,
  preItems,
}) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [items, setItems] = useState<OrderItemRow[]>([]);

  // Sub-modals for empty state quick creation
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products?limit=1000'),
      ]);

      const fetchedSuppliers: Supplier[] = supRes.data?.success ? supRes.data.data : [];
      const fetchedProducts: Product[] = prodRes.data?.success ? prodRes.data.data.products : [];

      setSuppliers(fetchedSuppliers);
      setAllProducts(fetchedProducts);

      // Select initial supplier
      let chosenSupplierId: number | '' = '';
      if (preSupplierId && fetchedSuppliers.some((s) => s.id === preSupplierId)) {
        chosenSupplierId = preSupplierId;
      } else if (fetchedSuppliers.length > 0) {
        chosenSupplierId = fetchedSuppliers[0].id;
      }
      setSupplierId(chosenSupplierId);

      // Compute initial expected delivery date
      const sup = fetchedSuppliers.find((s) => s.id === chosenSupplierId);
      const leadDays = sup ? sup.lead_time_days : 3;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + leadDays);
      setExpectedDate(targetDate.toISOString().slice(0, 10));

      // Populate line items
      if (preItems && preItems.length > 0) {
        // Filter out duplicate productIds in preItems
        const uniquePreItems: OrderItemRow[] = [];
        const seen = new Set<number>();
        for (const item of preItems) {
          const prod = fetchedProducts.find((p) => p.id === item.productId);
          if (prod && !seen.has(item.productId)) {
            seen.add(item.productId);
            uniquePreItems.push({
              productId: item.productId,
              quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
              unitCost: item.unitCost !== undefined && item.unitCost >= 0 ? item.unitCost : prod.cost_price,
            });
          }
        }
        setItems(uniquePreItems);
      } else if (fetchedProducts.length > 0) {
        // Find if any products are associated with this supplier first, else use first product
        const matchingSupplierProd = fetchedProducts.find((p) => p.supplier_id === chosenSupplierId);
        const initialProd = matchingSupplierProd || fetchedProducts[0];
        setItems([
          {
            productId: initialProd.id,
            quantity: 10,
            unitCost: initialProd.cost_price,
          },
        ]);
      } else {
        setItems([]);
      }
    } catch {
      showError('Failed to load products and suppliers for purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10);
    setSupplierId(id);

    const sup = suppliers.find((s) => s.id === id);
    if (sup) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + sup.lead_time_days);
      setExpectedDate(targetDate.toISOString().slice(0, 10));
    }
  };

  // Set of product IDs currently selected in the PO
  const selectedProductIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);

  // Available products in current shop not yet added to the PO
  const unselectedProducts = useMemo(
    () => allProducts.filter((p) => !selectedProductIds.has(p.id)),
    [allProducts, selectedProductIds]
  );

  const handleAddItem = () => {
    if (allProducts.length === 0) {
      showError('No products available in this shop to add.');
      return;
    }

    if (unselectedProducts.length === 0) {
      showError('All products from your shop have already been added to this purchase order.');
      return;
    }

    // Pick the first available unused product
    const nextProd = unselectedProducts[0];
    setItems((prev) => [
      ...prev,
      {
        productId: nextProd.id,
        quantity: 10,
        unitCost: nextProd.cost_price,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemRow, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      if (field === 'productId') {
        const newProdId = Number(value);
        const prod = allProducts.find((p) => p.id === newProdId);
        copy[index] = {
          ...copy[index],
          productId: newProdId,
          unitCost: prod ? prod.cost_price : copy[index].unitCost,
        };
      } else if (field === 'quantity') {
        const raw = Number(value);
        const qty = Math.max(1, Math.floor(raw || 1));
        copy[index] = {
          ...copy[index],
          quantity: qty,
        };
      } else if (field === 'unitCost') {
        const cost = Math.max(0, parseFloat(value) || 0);
        copy[index] = {
          ...copy[index],
          unitCost: cost,
        };
      }
      return copy;
    });
  };

  const totalItemLines = items.length;
  const totalUnitsCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalPurchaseCost = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      showError('Please select a supplier for this purchase order.');
      return;
    }

    if (items.length === 0) {
      showError('Please add at least one product to this purchase order.');
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (!item.productId || isNaN(item.productId)) {
        showError('Please select a valid product for each row.');
        return;
      }
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        showError('Order quantities must be positive whole numbers (1 or greater).');
        return;
      }
    }

    // Prevent duplicate products in payload
    const pIds = items.map((i) => i.productId);
    if (new Set(pIds).size !== pIds.length) {
      showError('Each product can only appear once in the purchase order.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/purchase-orders', {
        supplier_id: Number(supplierId),
        expected_delivery_date: expectedDate || undefined,
        items: items.map((i) => ({
          product_id: i.productId,
          quantity: Math.floor(Number(i.quantity)),
          unit_cost: Number(i.unitCost),
        })),
      });

      if (res.data?.success) {
        showSuccess(`Purchase Order ${res.data.data.order_number} created in PENDING status.`);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to create purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Purchase Order"
        subtitle="Replenish shop inventory from authorized suppliers"
        maxWidth="3xl"
      >
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading shop inventory & supplier records...</p>
          </div>
        ) : suppliers.length === 0 ? (
          /* Empty State: No Suppliers Available */
          <div className="py-8 px-4 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
              <Truck className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">No Suppliers Available</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                No suppliers available. Add a supplier before creating a purchase order.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(true)}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supplier</span>
              </button>
            </div>
          </div>
        ) : allProducts.length === 0 ? (
          /* Empty State: No Products Available */
          <div className="py-8 px-4 text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-200 shadow-2xs">
              <Package className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">No Products Available</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                No products available. Add products to your inventory before creating a purchase order.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form: Valid Supplier & Products Available */
          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Top row: Supplier & Expected Delivery Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={handleSupplierChange}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Lead time: {s.lead_time_days} {s.lead_time_days === 1 ? 'day' : 'days'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supplier assigned for dispatch and replenishment fulfillment.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expected Delivery Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Estimated arrival based on supplier's verified lead time.
                </p>
              </div>
            </div>

            {/* Line Items Container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Purchase Order Products
                  </h4>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={unselectedProducts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    unselectedProducts.length === 0
                      ? 'All products from your shop are already added'
                      : 'Add another product to PO'
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {unselectedProducts.length === 0 ? 'All Products Added' : 'Add Product'}
                  </span>
                </button>
              </div>

              {/* Items List */}
              <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto bg-slate-50/30 divide-y divide-slate-100">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400">
                    No products added. Click "+ Add Product" to add products from your shop inventory.
                  </div>
                ) : (
                  items.map((item, index) => {
                    const selectedProd = allProducts.find((p) => p.id === item.productId);
                    const lineTotal = (item.quantity || 0) * (item.unitCost || 0);

                    return (
                      <div
                        key={index}
                        className="pt-2.5 first:pt-0 pb-1 flex flex-col md:flex-row items-start md:items-center gap-3 bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs"
                      >
                        {/* Product selection */}
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(index, 'productId', parseInt(e.target.value, 10))
                            }
                            required
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500"
                          >
                            {allProducts.map((p) => {
                              // Disable if selected in another row
                              const isSelectedInOtherRow =
                                p.id !== item.productId && selectedProductIds.has(p.id);

                              return (
                                <option
                                  key={p.id}
                                  value={p.id}
                                  disabled={isSelectedInOtherRow}
                                  className={isSelectedInOtherRow ? 'text-slate-300' : 'text-slate-900'}
                                >
                                  {p.name} ({p.sku}) — Stock: {p.current_stock} — Cost: {formatCurrency(p.cost_price)}
                                  {isSelectedInOtherRow ? ' (Already added)' : ''}
                                </option>
                              );
                            })}
                          </select>

                          {/* Detail badges */}
                          {selectedProd && (
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                SKU: {selectedProd.sku}
                              </span>
                              <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                Current Stock: <strong className="font-bold">{selectedProd.current_stock}</strong>
                              </span>
                              <span className="text-slate-500">
                                Default Cost: {formatCurrency(selectedProd.cost_price)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Order Quantity */}
                        <div className="w-full sm:w-28">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Order Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                            }
                            required
                            className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-right focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Cost Price */}
                        <div className="w-full sm:w-32">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Cost Price (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)
                            }
                            required
                            className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg text-right focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-full sm:w-32 text-left sm:text-right">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Line Total
                          </label>
                          <div className="py-1.5 text-xs font-bold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>

                        {/* Delete row */}
                        <div className="pt-2 sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            title="Remove Product"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PO Total Summary Bar */}
              <div className="px-4 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-300">
                    Total Order Volume:{' '}
                    <strong className="text-white font-semibold">
                      {totalItemLines} {totalItemLines === 1 ? 'product' : 'products'} ({totalUnitsCount} units)
                    </strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs text-slate-300 uppercase tracking-wider font-medium">
                    Total Purchase Cost:
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formatCurrency(totalPurchaseCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanatory note on lifecycle */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lifecycle Notice:</strong> Creating a Purchase Order issues it in{' '}
                <span className="font-semibold underline">Pending</span> status without immediately altering inventory stock. Inventory stock increases atomically in PostgreSQL when the order is marked as <span className="font-semibold underline">Received</span>.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                <span>{submitting ? 'Generating PO...' : 'Create Purchase Order'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Sub-modal: Quick Add Product */}
      {showAddProductModal && (
        <ProductFormModal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onSuccess={() => {
            setShowAddProductModal(false);
            loadInitialData();
          }}
        />
      )}

      {/* Sub-modal: Quick Add Supplier */}
      {showAddSupplierModal && (
        <SupplierFormModal
          isOpen={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          onSuccess={() => {
            setShowAddSupplierModal(false);
            loadInitialData();
          }}
        />
      )}
    </>
  );
};
