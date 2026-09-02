import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layers, ArrowRight, Shield, User, Lock, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      showError('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login(cleanEmail, cleanPassword);
      showSuccess('Signed in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Invalid email or password credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: 'OWNER' | 'STAFF') => {
    try {
      setDemoLoading(role);
      await loginAsDemo(role);
      showSuccess(`Signed in as Demo ${role === 'OWNER' ? 'Business Owner' : 'Inventory Staff'}.`);
      navigate('/dashboard');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Demo login failed.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-xl">
            <Layers className="w-7 h-7" />
          </div>
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-white">
          StockPulse
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Smart Inventory Intelligence & Decision Support
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-slate-200">
          {/* Quick Demo 1-Click Login Section */}
          <div className="mb-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-3 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Demo Access</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('OWNER')}
                disabled={!!demoLoading}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 text-white font-semibold text-xs mb-0.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Owner Demo</span>
                </div>
                <span className="text-[10px] text-slate-400">Full privileges</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('STAFF')}
                disabled={!!demoLoading}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 text-white font-semibold text-xs mb-0.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Staff Demo</span>
                </div>
                <span className="text-[10px] text-slate-400">Sales & inventory</span>
              </button>
            </div>
          </div>

          {/* Regular Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@stockpulse.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
