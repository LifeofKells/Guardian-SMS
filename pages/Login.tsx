
import React, { useState } from 'react';
import { Button, Input, Label } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isAdminSignup, setIsAdminSignup] = useState(true); // Default to Admin/New Org for signups
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!companyName) { setError('Company Name is required.'); setLoading(false); return; }
                await signup(email, password, companyName);
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email is already in use.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else if (err.code === 'auth/admin-restricted-operation') {
                setError('This operation is restricted. Check Firebase config.');
            } else {
                setError('Authentication failed. Please try again.');
            }
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-slate-900/90 to-slate-950/90" />

                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 text-blue-400 shadow-xl shadow-blue-900/20">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-6">Security Operations, <br />Reimagined.</h1>
                    <p className="text-lg text-slate-300 leading-relaxed font-light">
                        Guardian provides a unified command center for workforce management, real-time dispatch, and intelligent reporting.
                    </p>

                    <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20"><Check className="h-4 w-4" /></div>
                            <span className="text-sm font-medium text-slate-200">Real-time Tracking</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><Check className="h-4 w-4" /></div>
                            <span className="text-sm font-medium text-slate-200">Automated Payroll</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20"><Check className="h-4 w-4" /></div>
                            <span className="text-sm font-medium text-slate-200">Client Portal</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20"><Check className="h-4 w-4" /></div>
                            <span className="text-sm font-medium text-slate-200">Incident Reporting</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-950">
                <div className="w-full max-w-sm space-y-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Guardian</h1>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {isLogin ? 'Welcome back' : 'Create an account'}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {isLogin ? 'Enter your credentials to access your dashboard.' : 'Get started with Guardian today.'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                {isLogin && <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-500">Forgot password?</button>}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            />
                        </div>

                        {!isLogin && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                                <Label htmlFor="company">Company Name</Label>
                                <Input
                                    id="company"
                                    type="text"
                                    placeholder="Acme Security Inc."
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all hover:scale-[1.01]" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? 'Sign In' : 'Create Account'}
                            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </form>

                    {/* Toggle Login/Signup */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">
                                {isLogin ? "New to Guardian?" : "Already have an account?"}
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); setIsAdminSignup(false); }}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-500 hover:underline underline-offset-4 transition-all"
                        >
                            {isLogin ? 'Create an account' : 'Sign in to your account'}
                        </button>
                    </div>

                    {/* Demo Credentials */}
                    <div className="pt-6 mt-6 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">Quick Demo Access</p>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => { setEmail('admin@guardian.com'); setPassword('password123'); setIsLogin(true); }}
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                            >
                                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-700">Admin</span>
                            </button>
                            <button
                                onClick={() => { setEmail('officer@guardian.com'); setPassword('password123'); setIsLogin(true); }}
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                            >
                                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-700">Officer</span>
                            </button>
                            <button
                                onClick={() => { setEmail('client@guardian.com'); setPassword('password123'); setIsLogin(true); }}
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                            >
                                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-700">Client</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
