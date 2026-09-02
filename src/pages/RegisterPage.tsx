import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Store,
  Users,
  Search,
  KeyRound,
  CheckCircle2,
  MapPin,
  X,
  AlertCircle,
  Building2,
} from 'lucide-react';
import api from '../services/api';

interface ShopSearchResult {
  id: number;
  name: string;
  location?: string | null;
}

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState<'OWNER' | 'STAFF'>('OWNER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Owner fields
  const [shopName, setShopName] = useState('');
  const [shopLocation, setShopLocation] = useState('');

  // Staff fields
  const [staffJoinCode, setStaffJoinCode] = useState('');
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShopSearchResult[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopSearchResult | null>(null);
  const [searchingShops, setSearchingShops] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced shop search for Staff role
  useEffect(() => {
    if (role !== 'STAFF' || selectedShop) return;

    const timer = setTimeout(async () => {
      try {
        setSearchingShops(true);
        const res = await api.get(`/auth/search-shops?q=${encodeURIComponent(shopSearchQuery.trim())}`);
        if (res.data?.success) {
          setSearchResults(res.data.data);
          setSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error('Failed to search businesses:', err);
      } finally {
        setSearchingShops(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [shopSearchQuery, role, selectedShop]);

  // Handle clicking outside of search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectShop = (shop: ShopSearchResult) => {
    setSelectedShop(shop);
    setShopSearchQuery(shop.name);
    setSearchDropdownOpen(false);
  };

  const handleClearSelectedShop = () => {
    setSelectedShop(null);
    setShopSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanName || !cleanEmail || !cleanPassword) {
      showError('Please fill in your name, email, and password.');
      return;
    }

    if (cleanPassword.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    if (role === 'OWNER') {
      const cleanShopName = shopName.trim();
      if (!cleanShopName) {
        showError('Please enter your Business / Shop Name.');
        return;
      }

      try {
        setSubmitting(true);
        await register({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role: 'OWNER',
          shopName: cleanShopName,
          shopLocation: shopLocation.trim() || undefined,
        });
        showSuccess(`Business "${cleanShopName}" created successfully!`);
        navigate('/dashboard');
      } catch (err: any) {
        showError(err.response?.data?.message || 'Failed to create business account.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Staff registration
      if (!selectedShop && !shopSearchQuery.trim()) {
        showError('Please search and select the business you are joining.');
        return;
      }

      const cleanJoinCode = staffJoinCode.trim();
      if (!cleanJoinCode) {
        showError('Please enter the Staff Join Code provided by your business owner.');
        return;
      }

      try {
        setSubmitting(true);
        await register({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role: 'STAFF',
          shopId: selectedShop ? selectedShop.id : undefined,
          shopName: selectedShop ? selectedShop.name : shopSearchQuery.trim(),
          staffJoinCode: cleanJoinCode,
        });
        showSuccess(`Successfully joined ${selectedShop?.name || 'business'} workspace!`);
        navigate('/dashboard');
      } catch (err: any) {
        showError(err.response?.data?.message || 'Failed to join business. Please verify join code.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-xl">
            <Layers className="w-7 h-7" />
          </div>
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Create StockPulse Account
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-400">
          Smart multi-tenant inventory intelligence & reorder platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-7 px-5 shadow-2xl rounded-2xl sm:px-8 text-slate-200">
          {/* Role Selection Header */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Select Registration Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Business Owner Choice */}
              <div
                onClick={() => setRole('OWNER')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                  role === 'OWNER'
                    ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 text-white'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${role === 'OWNER' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-white">Business Owner</span>
                    </div>
                    {role === 'OWNER' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Create and manage your own business inventory with a brand new workspace.
                  </p>
                </div>
              </div>

              {/* Inventory Staff Choice */}
              <div
                onClick={() => setRole('STAFF')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                  role === 'STAFF'
                    ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 text-white'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${role === 'STAFF' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-white">Inventory Staff</span>
                    </div>
                    {role === 'STAFF' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Join an existing business and help manage its inventory using a join code.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Personal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* OWNER SPECIFIC FIELDS */}
            {role === 'OWNER' && (
              <div className="p-4 bg-slate-800/50 border border-indigo-900/50 rounded-xl space-y-3 mt-2">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  <Store className="w-4 h-4" />
                  <span>New Business Configuration</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Business / Shop Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Apex Electronics, Metro Mart"
                    required
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Business Location / City <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={shopLocation}
                    onChange={(e) => setShopLocation(e.target.value)}
                    placeholder="e.g. Connaught Place, New Delhi"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Your business will start with clean zero-data (0 products, 0 suppliers, 0 sales). You will receive an exclusive <strong>Staff Join Code</strong> in settings to invite team members.
                  </span>
                </div>
              </div>
            )}

            {/* STAFF SPECIFIC FIELDS */}
            {role === 'STAFF' && (
              <div className="p-4 bg-slate-800/50 border border-indigo-900/50 rounded-xl space-y-3 mt-2">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>Join Existing Business Workspace</span>
                </div>

                {/* Business Search Field */}
                <div className="relative" ref={searchContainerRef}>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Business / Shop Name <span className="text-rose-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Enter the exact business or shop name you want to join.
                  </p>

                  {selectedShop ? (
                    /* Selected Shop Badge */
                    <div className="flex items-center justify-between p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-white">{selectedShop.name}</div>
                          {selectedShop.location && (
                            <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>{selectedShop.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedShop}
                        className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 cursor-pointer"
                        title="Change business"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Search Input */
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={shopSearchQuery}
                        onChange={(e) => {
                          setShopSearchQuery(e.target.value);
                          setSearchDropdownOpen(true);
                        }}
                        onFocus={() => setSearchDropdownOpen(true)}
                        placeholder="Search existing shop name (e.g. StockPulse Demo Retail)..."
                        required
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />

                      {/* Dropdown search results */}
                      {searchDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
                          {searchingShops ? (
                            <div className="p-3 text-xs text-slate-400 text-center">Searching businesses...</div>
                          ) : searchResults.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">
                              No businesses found matching "{shopSearchQuery}". Ensure the owner has registered first.
                            </div>
                          ) : (
                            searchResults.map((shop) => (
                              <button
                                key={shop.id}
                                type="button"
                                onClick={() => handleSelectShop(shop)}
                                className="w-full p-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <div className="text-xs font-bold text-white">{shop.name}</div>
                                  {shop.location && (
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-slate-500" />
                                      <span>{shop.location}</span>
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                                  Select
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Staff Join Code Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Staff Join Code <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={staffJoinCode}
                      onChange={(e) => setStaffJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SP-8K2A-9M4Q or DEMO-JOIN-2026"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ask your business owner for their active <strong>Staff Join Code</strong> from their Business Settings. (Demo code: <code className="text-indigo-300 font-mono">DEMO-JOIN-2026</code>)
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span>
                {submitting
                  ? 'Processing registration...'
                  : role === 'OWNER'
                  ? 'Create Business & Owner Account'
                  : 'Join Business Workspace'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
