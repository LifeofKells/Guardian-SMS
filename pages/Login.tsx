
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldCheck, AlertCircle, Loader2, ArrowRight, Mail, Lock,
  Eye, EyeOff, MapPin, Clock, BarChart2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE PILL
───────────────────────────────────────────────────────────────────────────── */
function FeaturePill({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/80 bg-white/10 border border-white/15 backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5 text-teal-400 shrink-0" />
      {text}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── LEFT PANEL — Navy Brand ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)' }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow accent */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-64 h-64 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-400/30">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Pro Guard</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal-400 bg-teal-400/10 border border-teal-400/20">
              Security Operations Platform
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Security Operations,<br />
              <span className="text-teal-400">Simplified.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Manage your entire security workforce from one intelligent command center — scheduling, timesheets, and client reporting all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2">
            <FeaturePill icon={MapPin} text="Real-time Guard Tracking" />
            <FeaturePill icon={Clock} text="Smart Shift Scheduling" />
            <FeaturePill icon={BarChart2} text="Automated Client Reports" />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-500 text-xs">
            © 2025 Pro Guard · All rights reserved
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — White Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#1e293b]">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
          </div>
          <span className="text-slate-900 font-semibold text-lg">Pro Guard</span>
        </div>

        <div className="w-full max-w-[380px] space-y-7">

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in</h2>
            <p className="text-sm text-slate-500">Enter your credentials to access the dashboard.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3.5 text-sm text-red-700 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 focus:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#0d9488] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none shadow-sm shadow-teal-500/20 mt-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Client portal link */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Are you a client?{' '}
              <a
                href="/portal"
                className="text-teal-600 font-medium hover:underline"
              >
                Access the Client Portal →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
