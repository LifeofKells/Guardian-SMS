
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    ShieldCheck, AlertCircle, Loader2, ArrowRight, Mail, Lock,
    Building2, Eye, EyeOff, Users, Shield, CheckCircle2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   AMBIENT GRID CANVAS
───────────────────────────────────────────────────────────────────────────── */
function GridCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf: number;
        let t = 0;

        const draw = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            const W = canvas.width;
            const H = canvas.height;
            const step = 44;

            ctx.clearRect(0, 0, W, H);

            // Horizontal rules
            for (let y = 0; y < H; y += step) {
                const pulse = 0.035 + 0.015 * Math.sin(t * 0.008 + y * 0.01);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // Vertical rules
            for (let x = 0; x < W; x += step) {
                const pulse = 0.025 + 0.01 * Math.sin(t * 0.009 + x * 0.012);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // Blue accent dot cluster bottom-right
            const accentX = W * 0.78;
            const accentY = H * 0.72;
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    const a = 0.10 + 0.07 * Math.sin(t * 0.012 + i * 0.4 + j * 0.3);
                    ctx.beginPath();
                    ctx.arc(accentX + i * 18, accentY + j * 18, 1.2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(96,165,250,${a})`; // blue-400
                    ctx.fill();
                }
            }

            // Top-left dot cluster
            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < 6; j++) {
                    const a = 0.07 + 0.05 * Math.sin(t * 0.01 + i * 0.5 + j * 0.4);
                    ctx.beginPath();
                    ctx.arc(W * 0.12 + i * 20, H * 0.14 + j * 20, 1, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255,${a})`;
                    ctx.fill();
                }
            }

            t++;
            raf = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(raf);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   INPUT FIELD
───────────────────────────────────────────────────────────────────────────── */
function Field({
    id, type, label, placeholder, value, onChange, required, icon: Icon, rightEl, autoComplete,
}: {
    id: string; type: string; label: string; placeholder: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean;
    icon: React.ElementType; rightEl?: React.ReactNode; autoComplete?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">{label}</label>
                {rightEl}
            </div>
            <div className={`
                relative flex items-center rounded-xl border transition-all duration-200
                ${focused
                    ? 'border-blue-400/60 bg-white/[0.08] shadow-[0_0_0_3px_rgba(96,165,250,0.10)]'
                    : 'border-white/[0.12] bg-white/[0.05] hover:border-white/[0.22] hover:bg-white/[0.07]'
                }
            `}>
                <Icon className={`absolute left-3.5 h-3.5 w-3.5 transition-colors duration-200 pointer-events-none ${focused ? 'text-blue-400' : 'text-white/40'}`} />
                <input
                    id={id} type={type} placeholder={placeholder} value={value}
                    onChange={onChange} required={required} autoComplete={autoComplete}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    className="w-full h-12 bg-transparent pl-10 pr-4 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none"
                />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE CLOCK
───────────────────────────────────────────────────────────────────────────── */
function LiveClock() {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const hh = time.getHours().toString().padStart(2, '0');
    const mm = time.getMinutes().toString().padStart(2, '0');
    const ss = time.getSeconds().toString().padStart(2, '0');
    return (
        <div className="font-mono text-[11px] text-white/35 tracking-widest select-none">
            {hh}<span className="animate-pulse">:</span>{mm}<span className="animate-pulse">:</span>{ss}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CAPABILITIES
───────────────────────────────────────────────────────────────────────────── */
const caps = [
    'Shift Scheduling',
    'Live Incident Logs',
    'Automated Payroll',
    'Client Portal',
    'Audit Trails',
    'Equipment Vault',
];

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                if (!companyName) { setError('Company name is required.'); setLoading(false); return; }
                await signup(email, password, companyName);
            }
        } catch (err: any) {
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters.');
            } else {
                setError('Authentication failed. Please try again.');
            }
        }
        setLoading(false);
    };

    const fillDemo = (demoEmail: string) => {
        setEmail(demoEmail);
        setPassword('password123');
        setIsLogin(true);
        setError('');
    };

    const switchMode = () => { setIsLogin(v => !v); setError(''); };

    return (
        <div className="min-h-screen w-full flex bg-[#0a0a0f] selection:bg-blue-400/20 overflow-hidden">

            {/* ────────────────────────────────────────────────────────────────
                LEFT — EDITORIAL HERO
            ──────────────────────────────────────────────────────────────── */}
            <div className="hidden lg:flex w-[54%] xl:w-[58%] relative flex-col overflow-hidden">

                <GridCanvas />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />

                {/* Blue accent bar — left edge */}
                <div className="absolute left-0 top-[18%] bottom-[18%] w-[2px] bg-gradient-to-b from-transparent via-blue-400/70 to-transparent" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full px-14 xl:px-18 py-12">

                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-auto">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-blue-400/10 border border-blue-400/25 flex items-center justify-center">
                                <ShieldCheck className="h-[18px] w-[18px] text-blue-400" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-[13px] font-black tracking-[0.1em] text-white uppercase">Pro Guard</p>
                                <p className="text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase">Security OS</p>
                            </div>
                        </div>
                        <LiveClock />
                    </div>

                    {/* Hero headline */}
                    <div className="my-auto">

                        {/* Eyebrow */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px w-6 bg-blue-400/70" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-blue-400/90">Enterprise Security Operations</span>
                        </div>

                        {/* Large type */}
                        <h1 className="text-[54px] xl:text-[62px] font-black leading-[0.95] tracking-[-0.03em] text-white">
                            Total<br />
                            <span className="text-white/20">Control</span><br />
                            <span className="relative inline-block">
                                In One
                                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-400 to-transparent" />
                            </span>
                            <br />
                            Platform.
                        </h1>

                        {/* Sub */}
                        <p className="text-[13px] text-white/55 mt-8 max-w-xs leading-relaxed font-light tracking-wide">
                            Scheduling, payroll, incident management, and
                            client reporting — unified under a single command interface.
                        </p>

                        {/* Capabilities */}
                        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3">
                            {caps.map(c => (
                                <div key={c} className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-blue-400/80 shrink-0" />
                                    <span className="text-[12px] font-semibold text-white/60 tracking-wide">{c}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom stat trio */}
                    <div className="mt-auto pt-12">
                        <div className="flex items-stretch gap-px">
                            {[
                                { n: '12K+', label: 'Officers on platform' },
                                { n: '98.7%', label: 'Incident resolution' },
                                { n: '4.9★', label: 'Client satisfaction' },
                            ].map((s, i) => (
                                <div
                                    key={s.label}
                                    className={`flex-1 px-5 py-4 bg-white/[0.03] ${i === 0 ? 'border border-white/[0.09] rounded-l-xl' : i === 2 ? 'border-t border-b border-r border-white/[0.09] rounded-r-xl' : 'border-t border-b border-white/[0.09]'}`}
                                >
                                    <p className="text-xl font-black text-white tracking-tight">{s.n}</p>
                                    <p className="text-[11px] text-white/45 font-medium mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-white/25 font-medium mt-5 tracking-wider">
                            © {new Date().getFullYear()} Pro Guard Security Platform · Enterprise Grade · SOC-2
                        </p>
                    </div>
                </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────
                RIGHT — AUTH FORM
            ──────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 xl:p-16 relative overflow-y-auto">

                {/* Right-side texture */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[#0a0a0f]" />
                    <div className="absolute inset-0 opacity-[0.025]"
                        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />
                    {/* Ambient blue glow behind form */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05]"
                        style={{ background: 'radial-gradient(ellipse at center, rgba(96,165,250,1) 0%, transparent 70%)' }}
                    />
                </div>

                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-3 mb-10 relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-blue-400/10 border border-blue-400/25 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-blue-400" strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-sm font-black tracking-[0.12em] text-white uppercase">Pro Guard</p>
                        <p className="text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase">Security OS</p>
                    </div>
                </div>

                <div className="w-full max-w-[380px] relative z-10">

                    {/* Mode toggle */}
                    <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/[0.09] p-1 mb-8">
                        {(['Sign In', 'Create Account'] as const).map((tab, i) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => { setIsLogin(i === 0); setError(''); }}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${(i === 0) === isLogin
                                    ? 'bg-blue-500 text-white shadow-[0_2px_16px_rgba(96,165,250,0.3)]'
                                    : 'text-white/45 hover:text-white/70'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Headline */}
                    <div className="mb-7">
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {isLogin ? 'Welcome back.' : 'Get started free.'}
                        </h2>
                        <p className="text-[13px] text-white/50 mt-1.5 font-medium">
                            {isLogin
                                ? 'Access your security command center.'
                                : 'Set up your organization in under a minute.'}
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/[0.09] border border-red-500/25 mb-5 animate-in slide-in-from-top-2 fade-in duration-200">
                            <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            <p className="text-[12px] font-medium text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {!isLogin && (
                            <div className="animate-in slide-in-from-top-3 fade-in duration-250">
                                <Field
                                    id="company" type="text" label="Company name"
                                    placeholder="Apex Security Inc."
                                    value={companyName} onChange={e => setCompanyName(e.target.value)}
                                    required icon={Building2} autoComplete="organization"
                                />
                            </div>
                        )}

                        <Field
                            id="email" type="email" label="Email address"
                            placeholder="you@company.com"
                            value={email} onChange={e => setEmail(e.target.value)}
                            required icon={Mail} autoComplete="email"
                        />

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Password</label>
                                {isLogin && (
                                    <button type="button" className="text-[10px] font-bold text-blue-400/70 hover:text-blue-400 transition-colors tracking-wider uppercase">
                                        Forgot?
                                    </button>
                                )}
                            </div>
                            <div className="relative flex items-center rounded-xl border border-white/[0.12] bg-white/[0.05] hover:border-white/[0.22] hover:bg-white/[0.07] transition-all duration-200 focus-within:border-blue-400/60 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_0_3px_rgba(96,165,250,0.10)]">
                                <Lock className="absolute left-3.5 h-3.5 w-3.5 text-white/40 pointer-events-none transition-colors" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    className="flex-1 h-12 bg-transparent pl-10 pr-11 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3.5 text-white/35 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full h-12 rounded-xl font-bold text-[13px] tracking-wide overflow-hidden group
                                    bg-blue-500 text-white
                                    hover:bg-blue-400
                                    shadow-[0_4px_20px_rgba(96,165,250,0.25)] hover:shadow-[0_8px_32px_rgba(96,165,250,0.40)]
                                    transition-all duration-200 hover:-translate-y-px active:translate-y-0
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {/* Shimmer */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                <span className="relative flex items-center justify-center gap-2">
                                    {loading
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating…</>
                                        : <>
                                            {isLogin ? 'Access Command Center' : 'Launch My Organization'}
                                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    }
                                </span>
                            </button>
                        </div>
                    </form>

                    {/* Switch */}
                    <p className="text-center text-[12px] text-white/40 mt-5">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                        {' '}
                        <button onClick={switchMode} className="font-bold text-white/65 hover:text-blue-400 transition-colors">
                            {isLogin ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-7">
                        <div className="flex-1 h-px bg-white/[0.07]" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/35">Demo access</span>
                        <div className="flex-1 h-px bg-white/[0.07]" />
                    </div>

                    {/* Demo buttons */}
                    <div className="grid grid-cols-3 gap-2.5">
                        {[
                            { role: 'Admin', icon: Shield, email: 'admin@guardian.com', accent: 'hover:border-blue-400/50 hover:text-blue-400' },
                            { role: 'Officer', icon: ShieldCheck, email: 'officer@guardian.com', accent: 'hover:border-emerald-400/50 hover:text-emerald-400' },
                            { role: 'Client', icon: Users, email: 'client@guardian.com', accent: 'hover:border-violet-400/50 hover:text-violet-400' },
                        ].map(({ role, icon: Icon, email: demoEmail, accent }) => (
                            <button
                                key={role}
                                onClick={() => fillDemo(demoEmail)}
                                className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border border-white/[0.09] bg-white/[0.03] text-white/45 font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-lg ${accent}`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="text-[10px] font-bold tracking-wide uppercase">{role}</span>
                            </button>
                        ))}
                    </div>

                    <p className="text-center text-[10px] text-white/30 mt-3 font-mono tracking-wider">
                        password: password123
                    </p>
                </div>
            </div>
        </div>
    );
}
