import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, AlertCircle } from 'lucide-react';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedProductId?: number;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedProductId,
}) => {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [productId, setProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSaleDate(new Date().toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api.get('/products?limit=200');
      if (res.data?.success) {
        const prods: Product[] = res.data.data.products;
        setProducts(prods);

        if (preSelectedProductId) {
          const found = prods.find((p) => p.id === preSelectedProductId);
          if (found) {
            setProductId(found.id);
            setUnitPrice(found.unit_price);
          }
        } else if (prods.length > 0 && productId === '') {
          setProductId(prods[0].id);
          setUnitPrice(prods[0].unit_price);
        }
      }
    } catch {
      showError('Failed to load product list.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === Number(productId));

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10);
    setProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setUnitPrice(prod.unit_price);
      if (quantity > prod.current_stock) {
        setQuantity(Math.max(1, prod.current_stock));
      }
    }
  };

  const totalAmount = (quantity || 0) * (unitPrice || 0);
  const isOutOfStock = selectedProduct ? selectedProduct.current_stock <= 0 : false;
  const isExceedingStock = selectedProduct ? quantity > selectedProduct.current_stock : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId || !selectedProduct) {
      showError('Please select a valid product.');
      return;
    }

    if (quantity <= 0) {
      showError('Quantity must be greater than 0.');
      return;
    }

    if (quantity > selectedProduct.current_stock) {
      showError(`Insufficient stock. Available: ${selectedProduct.current_stock}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/sales', {
        product_id: Number(productId),
        quantity,
        unit_price: unitPrice,
        sold_at: new Date(saleDate).toISOString(),
      });

      if (res.data?.success) {
        showSuccess(
          `Recorded sale of ${quantity}x "${selectedProduct.name}" for ${formatCurrency(totalAmount)}.`
        );
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to record sale.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record New Customer Sale"
      subtitle="Stock is atomically updated via PostgreSQL transaction"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Product <span className="text-rose-500">*</span>
          </label>
          {loadingProducts ? (
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <select
              value={productId}
              onChange={handleProductChange}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {p.current_stock} in stock
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selected Product Stock Banner */}
        {selectedProduct && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isOutOfStock
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : selectedProduct.current_stock <= selectedProduct.minimum_stock
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div>
              <span className="font-semibold">Available Stock:</span>{' '}
              <span className="font-bold text-sm">{selectedProduct.current_stock} units</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Default Price:</span>{' '}
              <span className="font-semibold">{formatCurrency(selectedProduct.unit_price)}</span>
            </div>
          </div>
        )}

        {/* Quantity & Unit Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedProduct ? selectedProduct.current_stock : 9999}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              required
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 ${
                isExceedingStock ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Sale Price (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {isExceedingStock && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Quantity exceeds available stock ({selectedProduct?.current_stock}).</span>
          </div>
        )}

        {/* Date Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Sold Date & Time
          </label>
          <input
            type="datetime-local"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Total Price summary box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Transaction Amount</p>
            <p className="text-xl font-bold mt-0.5">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            {quantity} units × {formatCurrency(unitPrice)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || isOutOfStock || isExceedingStock || quantity <= 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{submitting ? 'Recording...' : 'Complete Sale'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
