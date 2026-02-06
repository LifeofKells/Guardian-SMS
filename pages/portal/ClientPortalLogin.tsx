import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Button, Input, Label } from '../../components/ui';
import { Lock, Mail, Loader2, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function ClientPortalLogin() {
    const { login, isLoading } = useClientPortalAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login(email, password);
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err?.message || 'Invalid email or password. Make sure you have seeded data first.');
        }
    };

    const fillDemoCredentials = () => {
        setEmail('client@guardian.com');
        setPassword('demo123');
        setError('');
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Dynamic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />

                {/* Animated background shapes */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute top-1/2 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                <Shield className="h-7 w-7 text-white" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight">Client Portal</span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <h1 className="text-5xl font-bold leading-tight">
                            Real-time visibility<br />
                            into your security<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">services.</span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-md">
                            Monitor coverage, track incidents, and communicate directly with your security team — all in one place.
                        </p>

                        {/* Feature highlights */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            {[
                                { label: 'Live Coverage', desc: 'Real-time shift visibility' },
                                { label: 'Incident Reports', desc: 'Detailed documentation' },
                                { label: 'Service Requests', desc: 'Direct communication' },
                                { label: 'Monthly Analytics', desc: 'Performance insights' },
                            ].map((feature, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                                    <p className="font-semibold text-white">{feature.label}</p>
                                    <p className="text-sm text-slate-400 mt-1">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-sm text-slate-400">
                        Protected by enterprise-grade security
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg shadow-blue-500/25">
                            <Shield className="h-9 w-9 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Client Portal</h1>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-8 border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to access your security dashboard</p>
                        </div>

                        {/* Demo Credentials Helper */}
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-400 mb-2 font-medium">🔑 Demo Mode</p>
                            <p className="text-xs text-blue-600 dark:text-blue-500 mb-3">
                                First, generate data in the main app Settings → "Generate Standard Data"
                            </p>
                            <button
                                type="button"
                                onClick={fillDemoCredentials}
                                className="w-full text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Use Demo Credentials
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-800/30 flex items-center justify-center shrink-0">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="pl-12 h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                                    <a href="#" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-12 pr-12 h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Need portal access?{' '}
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Contact your security provider</span>
                        </p>
                    </div>

                    {/* Trust badges */}
                    <div className="mt-8 flex items-center justify-center gap-6 text-slate-400">
                        <div className="flex items-center gap-2 text-xs">
                            <Lock className="h-3.5 w-3.5" />
                            <span>256-bit SSL</span>
                        </div>
                        <div className="h-4 w-px bg-slate-300" />
                        <div className="flex items-center gap-2 text-xs">
                            <Shield className="h-3.5 w-3.5" />
                            <span>SOC 2 Compliant</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
