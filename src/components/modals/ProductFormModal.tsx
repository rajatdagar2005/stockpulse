import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Product, Supplier } from '../../types';
import { Package, Save } from 'lucide-react';
import { CategorySelect } from '../common/CategorySelect';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}) => {
  const { showSuccess, showError } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Dairy',
    description: '',
    current_stock: 0,
    minimum_stock: 10,
    unit_price: 0,
    cost_price: 0,
    supplier_id: 1,
    safety_stock: 10,
  });

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      if (productToEdit) {
        setFormData({
          name: productToEdit.name,
          sku: productToEdit.sku,
          category: productToEdit.category,
          description: productToEdit.description || '',
          current_stock: productToEdit.current_stock,
          minimum_stock: productToEdit.minimum_stock,
          unit_price: productToEdit.unit_price,
          cost_price: productToEdit.cost_price,
          supplier_id: productToEdit.supplier_id,
          safety_stock: productToEdit.safety_stock,
        });
      } else {
        setFormData({
          name: '',
          sku: '',
          category: 'Dairy',
          description: '',
          current_stock: 20,
          minimum_stock: 15,
          unit_price: 100,
          cost_price: 80,
          supplier_id: 1,
          safety_stock: 10,
        });
      }
    }
  }, [isOpen, productToEdit]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data?.success) {
        setSuppliers(res.data.data);
        if (!productToEdit && res.data.data.length > 0) {
          setFormData((prev) => ({ ...prev, supplier_id: res.data.data[0].id }));
        }
      }
    } catch {
      showError('Failed to load suppliers.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number' || name === 'supplier_id'
          ? name === 'supplier_id' || name === 'current_stock' || name === 'minimum_stock' || name === 'safety_stock'
            ? parseInt(value, 10) || 0
            : parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Product name is required.');
      return;
    }

    if (!formData.sku.trim()) {
      showError('SKU is required.');
      return;
    }

    const payload = {
      ...formData,
      current_stock: Number(formData.current_stock) || 0,
      minimum_stock: Number(formData.minimum_stock) || 0,
      unit_price: Number(formData.unit_price) || 0,
      cost_price: Number(formData.cost_price) || 0,
      supplier_id: Number(formData.supplier_id),
      safety_stock: Number(formData.safety_stock) || 0,
    };

    try {
      setSubmitting(true);
      if (productToEdit) {
        await api.put(`/products/${productToEdit.id}`, payload);
        showSuccess(`Product "${formData.name}" updated successfully.`);
      } else {
        await api.post('/products', payload);
        showSuccess(`Product "${formData.name}" created successfully.`);
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product' : 'Add New Inventory Product'}
      subtitle={productToEdit ? `Modifying SKU: ${productToEdit.sku}` : 'Configure pricing, supplier, and stock metrics'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and SKU */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Amul Taaza Milk 1L"
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              placeholder="e.g. DAIRY-AML-001"
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>
        </div>

        {/* Category & Supplier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <CategorySelect
              value={formData.category}
              onChange={(cat) => setFormData((prev) => ({ ...prev, category: cat }))}
              required
              allowCustomInput
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Primary Supplier <span className="text-rose-500">*</span>
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.lead_time_days}d lead)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing: Selling Price vs Cost Price */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Retail Price (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cost Price (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="cost_price"
              value={formData.cost_price}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Stock & Intelligence Thresholds */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Current Stock <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              name="current_stock"
              value={formData.current_stock}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Minimum Stock
            </label>
            <input
              type="number"
              min="0"
              name="minimum_stock"
              value={formData.minimum_stock}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Safety Stock Buffer
            </label>
            <input
              type="number"
              min="0"
              name="safety_stock"
              value={formData.safety_stock}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description / Specifications
          </label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            placeholder="Product packaging, variants, barcode details..."
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : productToEdit ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
