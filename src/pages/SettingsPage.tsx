import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Database,
  RefreshCw,
  Store,
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  Copy,
  Check,
  MapPin,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/formatters';

interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface ShopDetails {
  id: number;
  name: string;
  location?: string | null;
  staff_join_code?: string;
  join_code_updated_at?: string;
  created_at: string;
}

export const SettingsPage: React.FC = () => {
  const { user, loginAsDemo } = useAuth();
  const { showSuccess, showError } = useToast();

  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  // Staff members state for shop owner
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  useEffect(() => {
    fetchShopDetails();
    if (user?.role === 'OWNER') {
      fetchStaffList();
    }
  }, [user]);

  const fetchShopDetails = async () => {
    try {
      setLoadingShop(true);
      const res = await api.get('/auth/shop-details');
      if (res.data?.success) {
        setShopDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch shop details:', err);
    } finally {
      setLoadingShop(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      setLoadingStaff(true);
      const res = await api.get('/auth/staff');
      if (res.data?.success) {
        setStaffList(res.data.data);
      }
    } catch {
      // Ignored if not authorized
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleCopyJoinCode = () => {
    if (!shopDetails?.staff_join_code) return;
    navigator.clipboard.writeText(shopDetails.staff_join_code);
    setCopiedCode(true);
    showSuccess('Staff Join Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRegenerateJoinCode = async () => {
    try {
      setRegeneratingCode(true);
      const res = await api.post('/auth/regenerate-join-code');
      if (res.data?.success) {
        setShopDetails((prev) =>
          prev
            ? {
                ...prev,
                staff_join_code: res.data.data.staff_join_code,
                join_code_updated_at: res.data.data.join_code_updated_at,
              }
            : null
        );
        showSuccess('New Staff Join Code generated. Previous codes have been invalidated.');
        setRegenerateDialogOpen(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to regenerate join code.');
    } finally {
      setRegeneratingCode(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail || !newStaffPassword) {
      showError('Please fill in all staff fields.');
      return;
    }
    if (newStaffPassword.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    try {
      setAddingStaff(true);
      const res = await api.post('/auth/staff', {
        name: newStaffName,
        email: newStaffEmail,
        password: newStaffPassword,
      });
      if (res.data?.success) {
        showSuccess(`Staff account for ${newStaffName} created for ${user?.shop_name}!`);
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPassword('');
        setShowAddStaffModal(false);
        fetchStaffList();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to create staff member.');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: number, staffName: string) => {
    if (!confirm(`Are you sure you want to remove ${staffName} from your shop?`)) return;

    try {
      const res = await api.delete(`/auth/staff/${staffId}`);
      if (res.data?.success) {
        showSuccess('Staff member removed.');
        fetchStaffList();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to remove staff member.');
    }
  };

  const handleResetDatabase = async () => {
    try {
      setResetting(true);
      const res = await api.post('/admin/reset-seed');
      if (res.data?.success) {
        showSuccess('PostgreSQL database re-seeded with realistic retail data successfully.');
        setResetDialogOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to re-seed database. Owner role required.');
    } finally {
      setResetting(false);
    }
  };

  const handleSwitchDemoAccount = async (role: 'OWNER' | 'STAFF') => {
    try {
      setSwitchingRole(true);
      await loginAsDemo(role);
      showSuccess(`Switched to Demo ${role === 'OWNER' ? 'Business Owner' : 'Inventory Staff'}.`);
    } catch {
      showError('Failed to switch demo account.');
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tenant shop management, staff invitation credentials, and PostgreSQL architecture
        </p>
      </div>

      {/* Shop Tenant Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-600" />
          <span>Shop & Business Tenant</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Shop Name
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block truncate">
              {shopDetails?.name || user?.shop_name || 'My Shop'}
            </span>
            {shopDetails?.location && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{shopDetails.location}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Tenant Shop ID
            </span>
            <span className="text-base font-mono font-bold text-indigo-700 mt-0.5 block">
              #{user?.shop_id || 1}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">Multi-tenant SQL isolation</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Data Isolation
            </span>
            <span className="inline-flex items-center gap-1.5 mt-1 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Fully Isolated Tenant
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">Dedicated shop catalog & sales</span>
          </div>
        </div>

        {/* Staff Join Code Section for Owners */}
        {user?.role === 'OWNER' && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="bg-gradient-to-r from-indigo-900/5 via-indigo-900/10 to-indigo-900/5 border border-indigo-200/80 rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span>Staff Join Code</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      Owner Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-lg">
                    Share this unique verification code with your staff members. When they register with the <strong>Inventory Staff</strong> role and select your business, they must enter this code to securely access your inventory.
                  </p>
                  {shopDetails?.join_code_updated_at && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Last updated: {formatDate(shopDetails.join_code_updated_at)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="px-4 py-2 bg-white border border-indigo-300 rounded-xl font-mono text-sm font-bold text-indigo-900 tracking-wider shadow-xs select-all">
                      {shopDetails?.staff_join_code || 'DEMO-JOIN-2026'}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyJoinCode}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                      title="Copy Staff Join Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRegenerateDialogOpen(true)}
                    className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate new code</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          <span>Active User Session</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Full Name
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{user?.name}</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Email Address
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{user?.email}</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Assigned Role
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900">
                {user?.role === 'OWNER' ? 'Business Owner (Admin)' : 'Inventory Staff'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
              Member Since
            </span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">
              {formatDate(user?.created_at)}
            </span>
          </div>
        </div>

        {/* Demo Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
            Quick Role Switcher (Demo Mode)
          </span>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => handleSwitchDemoAccount('OWNER')}
              disabled={user?.role === 'OWNER' || switchingRole}
              className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Switch to Demo Owner</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchDemoAccount('STAFF')}
              disabled={user?.role === 'STAFF' || switchingRole}
              className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            >
              <User className="w-3.5 h-3.5" />
              <span>Switch to Demo Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff Management for Owner */}
      {user?.role === 'OWNER' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Shop Staff & Team Members</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff members added here or registered via join code share access to <span className="font-semibold text-slate-700">{user?.shop_name}</span> inventory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Directly</span>
            </button>
          </div>

          {loadingStaff ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading team members...</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {staffList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {m.name}
                        {m.id === user.id && (
                          <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.role === 'OWNER'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(m.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {m.role === 'STAFF' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(m.id, m.name)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove staff member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {staffList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No additional staff members yet. Share your Staff Join Code or click "Add Staff Directly".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Staff Member Directly</h3>
            <p className="text-xs text-slate-500 mb-4">
              This staff member will have access to your shop ({user?.shop_name}) inventory.
            </p>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Full Name</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Priya Sharma"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email</label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="priya@store.com"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStaff}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {addingStaff ? 'Adding...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database & System Architecture */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <span>PostgreSQL Multi-Tenant Architecture</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All data transactions (inventory stock decrements, purchase orders, receiving, calculations) are
          strictly backed by transactional SQL ACID integrity and isolated per shop tenant.
        </p>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Engine:</span>
            <span className="font-mono text-emerald-700 font-bold">PostgreSQL Relational DB</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Tenant Isolation:</span>
            <span className="font-mono text-slate-900">Foreign Key (shop_id) on all business tables</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Transactional Isolation:</span>
            <span className="font-mono text-slate-900">BEGIN / COMMIT / ROLLBACK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Reorder Forecast Mode:</span>
            <span className="text-indigo-700 font-bold">30-Day Velocity + Dynamic Lead Times</span>
          </div>
        </div>

        {/* Re-seed action button for Demo Owner */}
        {user?.role === 'OWNER' && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Reset & Seed Demo Retail Data</h4>
              <p className="text-[11px] text-slate-500">
                Restores initial products, suppliers, purchase orders, and realistic sales history for the Demo Shop.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-seed Demo Shop</span>
            </button>
          </div>
        )}
      </div>

      {/* Regenerate Join Code Dialog */}
      <ConfirmDialog
        isOpen={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        onConfirm={handleRegenerateJoinCode}
        title="Regenerate Staff Join Code"
        message="Generating a new Staff Join Code will immediately invalidate your previous code. Existing staff accounts remain active, but future staff registrations must use the new code. Are you sure?"
        confirmLabel="Generate New Code"
        isLoading={regeneratingCode}
      />

      {/* Re-seed confirmation dialog */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset & Re-seed Database"
        message="This will wipe custom sales/products and reset all tables with demo retail inventory data. Are you sure?"
        confirmLabel="Reset & Re-seed Now"
        isDestructive
        isLoading={resetting}
      />
    </div>
  );
};
