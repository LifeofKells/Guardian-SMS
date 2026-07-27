import React, { useState } from 'react';
import { useClientPortalAuth } from '../contexts/ClientPortalAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedDarkModeToggle } from './AnimatedDarkModeToggle';
import {
    LogOut, Menu, X, LayoutDashboard, FileText, MessageSquarePlus,
    Bell, ChevronDown, Building2, HelpCircle, Settings, User,
    Shield, Sparkles, Phone, ExternalLink, Search, CheckCircle2,
    Activity, Clock
} from 'lucide-react';

interface ClientPortalLayoutProps {
    children: React.ReactNode;
    currentPage?: string;
    onNavigate?: (page: string) => void;
}

export function ClientPortalLayout({ children, currentPage = 'dashboard', onNavigate }: ClientPortalLayoutProps) {
    const { organization, logout, client, user } = useClientPortalAuth();
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Get white-label branding or fall back to defaults
    const branding = organization?.white_label || {
        company_name: 'Pro Guard',
        primary_color: '#3b82f6',
        secondary_color: '#1e40af',
        logo_url: undefined,
    };

    const navLinks = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/portal' },
        { id: 'reports', label: 'Reports Hub', icon: FileText, href: '/portal/reports' },
        { id: 'instructions', label: 'Site Protocols', icon: Building2, href: '/portal/instructions' },
        { id: 'requests', label: 'Service Requests', icon: MessageSquarePlus, href: '/portal/requests' },
    ];

    const mockNotifications = [
        { id: '1', title: 'Shift Complete', desc: 'Evening patrol at Main Lobby completed by M. Johnson', time: '10m ago', unread: true },
        { id: '2', title: 'Monthly Report Ready', desc: 'May 2026 Security Summary is ready for download', time: '1h ago', unread: true },
        { id: '3', title: 'Request Approved', desc: 'Extra coverage for Friday event has been approved', time: '1d ago', unread: false },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
            
            {/* Top Security Status Bar */}
            <div className="relative z-50 bg-slate-900/90 border-b border-white/[0.06] backdrop-blur-md px-4 py-1.5 text-xs text-slate-400 flex items-center justify-between">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wider uppercase text-[10px]">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            Live Monitoring Active
                        </span>
                        <span className="hidden sm:inline text-slate-600">|</span>
                        <span className="hidden sm:inline text-slate-400 truncate max-w-xs">
                            {organization?.name || 'AsoRock Security Services'}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px]">
                        <span className="hidden md:inline text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            24/7 Dispatch: <a href="tel:18005550199" className="text-blue-400 hover:underline font-mono">+1 (800) 555-0199</a>
                        </span>
                        <button
                            onClick={() => onNavigate?.('profile')}
                            className="text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <Shield className="h-3.5 w-3.5 text-blue-400" />
                            <span>{client?.name || 'Client Portal'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/[0.08] shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Brand Logo & Client Badge */}
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigate?.('dashboard')}>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-500" />
                                <div
                                    className="relative h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-2xl bg-slate-900 border border-white/20"
                                    style={{
                                        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color || branding.primary_color})`,
                                    }}
                                >
                                    {branding.company_name.charAt(0)}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold tracking-tight text-white">
                                        {branding.company_name}
                                    </span>
                                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                        Client Intelligence
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                                    {client?.name || 'Secure Operations Portal'}
                                </p>
                            </div>
                        </div>

                        {/* Desktop Navigation Tabs */}
                        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-white/[0.06] shadow-inner">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = currentPage === link.id;
                                return (
                                    <button
                                        key={link.id}
                                        onClick={() => onNavigate?.(link.id)}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300
                                            ${isActive
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-white/20 scale-[1.02]'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                            }
                                        `}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                        {link.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Right Utility Actions */}
                        <div className="flex items-center gap-3">
                            {/* Quick Notification Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className="relative p-2.5 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08] transition-all"
                                    title="Notifications"
                                >
                                    <Bell className="h-4 w-4" />
                                    <span className="absolute top-2 right-2 h-2 w-2 bg-blue-500 rounded-full ring-4 ring-slate-950 animate-pulse" />
                                </button>

                                {isNotificationsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                                        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                                    <Bell className="h-3.5 w-3.5 text-blue-400" />
                                                    Activity Notifications
                                                </h4>
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">2 New</span>
                                            </div>
                                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                                {mockNotifications.map((n) => (
                                                    <div key={n.id} className={`p-2.5 rounded-xl border text-xs transition-colors ${n.unread ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-950/50 border-white/5'}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-white">{n.title}</span>
                                                            <span className="text-[10px] text-slate-500">{n.time}</span>
                                                        </div>
                                                        <p className="text-slate-400 leading-relaxed text-[11px]">{n.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => { onNavigate?.('reports'); setIsNotificationsOpen(false); }}
                                                className="w-full mt-3 py-2 text-center text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors border-t border-white/[0.08]"
                                            >
                                                View All Operational Activity →
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Theme Switcher */}
                            <div className="hidden sm:flex items-center bg-slate-900/80 border border-white/[0.08] rounded-xl px-1 py-1">
                                <AnimatedDarkModeToggle
                                    isDark={theme === 'dark'}
                                    onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    size="sm"
                                />
                            </div>

                            {/* User Profile Pill */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-slate-900/90 border border-white/[0.08] hover:border-white/20 hover:bg-slate-800 transition-all shadow-md group"
                                >
                                    <div
                                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md"
                                        style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color || branding.primary_color})` }}
                                    >
                                        {user?.full_name?.charAt(0) || client?.name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-xs font-bold text-white truncate max-w-[110px] group-hover:text-blue-400 transition-colors">
                                            {user?.full_name?.split(' ')[0] || 'Client Account'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
                                            {client?.name || 'Verified Client'}
                                        </p>
                                    </div>
                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180 text-blue-400' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                        <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-3 bg-slate-950/80 rounded-xl border border-white/[0.06] mb-2">
                                                <p className="text-xs font-bold text-white truncate">{client?.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                                                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                                    Active Client License
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => {
                                                        onNavigate?.('profile');
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                                                >
                                                    <User className="h-4 w-4 text-blue-400" />
                                                    Account & Settings
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onNavigate?.('instructions');
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                                                >
                                                    <Building2 className="h-4 w-4 text-indigo-400" />
                                                    Site Protocols & SOPs
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onNavigate?.('requests');
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                                                >
                                                    <MessageSquarePlus className="h-4 w-4 text-emerald-400" />
                                                    Submit Service Request
                                                </button>
                                            </div>
                                            <div className="border-t border-white/[0.08] mt-2 pt-2">
                                                <button
                                                    onClick={logout}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                    Sign Out of Portal
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile Drawer Toggle */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/10"
                            >
                                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Drawer Menu */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" />
                        <div
                            className="absolute top-0 right-0 h-full w-[300px] bg-slate-900 border-l border-white/10 shadow-2xl p-6 flex flex-col justify-between z-50 animate-in slide-in-from-right duration-300"
                            onClick={e => e.stopPropagation()}
                        >
                            <div>
                                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">
                                            {branding.company_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{branding.company_name}</p>
                                            <p className="text-[10px] text-blue-400">Client Portal</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <nav className="space-y-2">
                                    {navLinks.map((link) => {
                                        const Icon = link.icon;
                                        const isActive = currentPage === link.id;
                                        return (
                                            <button
                                                key={link.id}
                                                onClick={() => {
                                                    onNavigate?.(link.id);
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`
                                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                                                    ${isActive
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }
                                                `}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {link.label}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="pt-6 border-t border-white/10 space-y-3">
                                <button
                                    onClick={() => { onNavigate?.('profile'); setIsMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700"
                                >
                                    <User className="h-4 w-4 text-blue-400" />
                                    Account Profile Settings
                                </button>
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                {children}
            </main>

            {/* Architectural Footer */}
            <footer className="relative z-10 border-t border-white/[0.08] bg-slate-950/80 backdrop-blur-md mt-auto py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                {branding.company_name.charAt(0)}
                            </div>
                            <div className="text-xs text-slate-400">
                                <span className="font-bold text-white">{branding.company_name}</span> Security Intelligence Hub
                                <span className="mx-2 text-slate-600">•</span>
                                <span>© {new Date().getFullYear()} All Rights Reserved</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs text-slate-400">
                            <button onClick={() => onNavigate?.('instructions')} className="hover:text-white transition-colors">
                                Site Protocols
                            </button>
                            <button onClick={() => onNavigate?.('reports')} className="hover:text-white transition-colors">
                                Reports & Analytics
                            </button>
                            <button onClick={() => onNavigate?.('requests')} className="hover:text-white transition-colors">
                                Service Requests
                            </button>
                            <a href="tel:18005550199" className="text-blue-400 hover:underline flex items-center gap-1 font-mono">
                                <Phone className="h-3 w-3" />
                                24/7 Operations Support
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

