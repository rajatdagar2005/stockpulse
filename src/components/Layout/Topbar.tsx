import React from 'react';
import { Menu, Plus, ShoppingCart, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  onOpenRecordSale?: () => void;
  onOpenAddProduct?: () => void;
  onOpenCreatePO?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  onOpenRecordSale,
  onOpenAddProduct,
  onOpenCreatePO,
}) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {user?.shop_name || 'StockPulse Shop'}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PostgreSQL Multi-Tenant
          </span>
        </div>
      </div>

      {/* Action Buttons & User Profile */}
      <div className="flex items-center gap-2.5">
        {onOpenRecordSale && (
          <button
            type="button"
            onClick={onOpenRecordSale}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Record Sale</span>
          </button>
        )}

        {onOpenAddProduct && (
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        )}

        {onOpenCreatePO && (
          <button
            type="button"
            onClick={onOpenCreatePO}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Order PO</span>
          </button>
        )}

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Account'}</p>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              <span className="text-[10px] text-slate-500 font-semibold">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
