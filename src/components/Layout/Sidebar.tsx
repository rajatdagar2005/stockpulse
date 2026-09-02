import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  RefreshCw,
  Archive,
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const mainNavItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', to: '/products', icon: Package },
    { name: 'Sales', to: '/sales', icon: ShoppingCart },
    { name: 'Reorder Center', to: '/reorders', icon: RefreshCw, highlight: true },
    { name: 'Dead Stock', to: '/dead-stock', icon: Archive },
    { name: 'Suppliers', to: '/suppliers', icon: Truck },
    { name: 'Purchase Orders', to: '/orders', icon: ClipboardList },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 flex items-center gap-3 px-5 border-b border-slate-800/80 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white tracking-tight truncate">
                {user?.shop_name || 'StockPulse'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-300 font-medium truncate">
              {user?.role === 'OWNER' ? 'Shop Owner Workspace' : 'Shop Staff Workspace'}
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Main Navigation
          </div>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="flex-1">{item.name}</span>
                {item.highlight && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Intelligence Pro tip card */}
        <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reorder Engine Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Stock calculations are based on 30-day velocity and supplier lead times.
          </p>
        </div>

        {/* Bottom Profile / Settings */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-1">
          <NavLink
            to="/settings"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/settings'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings & Demo</span>
          </NavLink>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          {/* User info pill */}
          <div className="mt-2 pt-2 px-3 flex items-center gap-2.5 border-t border-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <span className="text-[10px] text-indigo-300 font-medium">
                {user?.role === 'OWNER' ? 'Business Owner' : 'Inventory Staff'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
