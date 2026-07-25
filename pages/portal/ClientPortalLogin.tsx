import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Button, Input, Label } from '../../components/ui';
import { Lock, Mail, Loader2, Shield, Eye, EyeOff, ArrowRight, ShieldCheck, Activity, BarChart4 } from 'lucide-react';

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
        <div className="min-h-screen flex bg-background selection:bg-primary/30">
            {/* Left Panel - Immersive Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-slate-950">
                {/* Immersive Deep Space Gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />

                {/* Animated organic orbs */}
                <div className="absolute inset-0 overflow-hidden opacity-60">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                </div>

                {/* Refined Grid Engine Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                    backgroundSize: '4rem 4rem'
                }} />

                {/* Foreground Content */}
                <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full text-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl glass-gradient-border">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <span className="text-3xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                            Pro Guard
                        </span>
                    </div>

                    <div className="max-w-xl space-y-10">
                        <h1 className="text-6xl font-bold leading-[1.1] tracking-tight text-white mb-6">
                            Client Intelligence <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Portal.</span>
                        </h1>
                        <p className="text-xl text-slate-400 font-light leading-relaxed max-w-lg">
                            Monitor live operations, access detailed incident reports, and measure service performance in flawless real-time.
                        </p>

                        {/* Floating Feature Cards */}
                        <div className="grid grid-cols-2 gap-6 pt-8">
                            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl hover:bg-white/10 transition-colors duration-300 group">
                                <Activity className="h-8 w-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                                <p className="font-semibold text-white text-lg mb-1">Live Feed</p>
                                <p className="text-sm text-slate-400">Instant visibility into on-site guard activity.</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl hover:bg-white/10 transition-colors duration-300 group">
                                <BarChart4 className="h-8 w-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                                <p className="font-semibold text-white text-lg mb-1">Deep Analytics</p>
                                <p className="text-sm text-slate-400">Metrics, coverage data, and KPI tracking.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-slate-400" />
                            End-to-End Encrypted
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-400" />
                            SOC 2 Type II
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Interface */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">

                {/* Subtle light mode background flare */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none dark:hidden">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-[440px] relative z-10 w-full animate-in slide-in-from-bottom-8 zoom-in-[0.98] duration-700 ease-out">
                    {/* Mobile Branding */}
                    <div className="lg:hidden text-center mb-10 flex flex-col items-center">
                        <div className="h-16 w-16 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Pro Guard</h1>
                    </div>

                    {/* Premium Form Container */}
                    <div className="glass-card-depth p-8 sm:p-10 rounded-[2rem]">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">Welcome back</h2>
                            <p className="text-muted-foreground font-medium text-sm">Secure access to your intelligence dashboard</p>
                        </div>

                        {/* Interactive Demo Callout */}
                        <div className="mb-8 p-5 rounded-3xl bg-primary/5 border border-primary/20 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 rounded-3xl" />
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                                    <span className="text-lg">✨</span> Demo Account
                                </p>
                                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                    Auto-fill with mock client credentials to explore the portal features right away.
                                </p>
                                <Button
                                    type="button"
                                    onClick={fillDemoCredentials}
                                    variant="outline"
                                    className="w-full h-10 rounded-xl bg-background/50 backdrop-border text-xs uppercase tracking-wider font-bold text-primary border-primary/20 hover:bg-primary hover:text-white transition-all duration-300"
                                >
                                    Auto-Fill Demo Info
                                </Button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium leading-relaxed pt-1.5">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-300" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="pl-12 h-14 bg-background border-border/60 hover:border-border focus:border-primary shadow-sm rounded-2xl text-base"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline mb-2">
                                    <Label htmlFor="password" className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1 mb-0">Password</Label>
                                    <a href="#" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                                        Recover
                                    </a>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-300" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-12 pr-12 h-14 bg-background border-border/60 hover:border-border focus:border-primary shadow-sm rounded-2xl text-base"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-14 text-base font-bold tracking-wide rounded-2xl group overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_hsl(var(--primary)/0.4)]"
                                    disabled={isLoading}
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Access Portal
                                            <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-10 text-center text-sm font-medium text-muted-foreground">
                        Require elevated access?{' '}
                        <a href="#" className="text-foreground hover:text-primary transition-colors border-b decoration-primary/30 border-primary/30 pb-0.5 inline-block ml-1">
                            Contact Operations
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
