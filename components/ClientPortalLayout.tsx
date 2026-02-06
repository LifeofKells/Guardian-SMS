import React, { useState } from 'react';
import { useClientPortalAuth } from '../contexts/ClientPortalAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedDarkModeToggle } from './AnimatedDarkModeToggle';
import {
    LogOut, Menu, X, LayoutDashboard, FileText, MessageSquarePlus,
    Bell, ChevronDown, Building2, HelpCircle, Settings, User
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

    // Get white-label branding or fall back to defaults
    const branding = organization?.white_label || {
        company_name: 'Guardian SMS',
        primary_color: '#3b82f6',
        secondary_color: '#1e40af',
        logo_url: undefined,
    };

    const navLinks = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/portal' },
        { id: 'reports', label: 'Reports Hub', icon: FileText, href: '/portal/reports' },
        { id: 'instructions', label: 'Site Instructions', icon: Building2, href: '/portal/instructions' },
        { id: 'requests', label: 'Service Requests', icon: MessageSquarePlus, href: '/portal/requests' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo/Brand */}
                        <div className="flex items-center gap-4">
                            {branding.logo_url ? (
                                <img src={branding.logo_url} alt="Logo" className="h-9 w-9 object-contain" />
                            ) : (
                                <div
                                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color || branding.primary_color})`,
                                        boxShadow: `0 4px 14px ${branding.primary_color}40`
                                    }}
                                >
                                    {branding.company_name.charAt(0)}
                                </div>
                            )}
                            <div className="hidden sm:block">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {branding.company_name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    Client Portal
                                </span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = currentPage === link.id;
                                return (
                                    <button
                                        key={link.id}
                                        onClick={() => onNavigate?.(link.id)}
                                        className={`
                                            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                                            ${isActive
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                            }
                                        `}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {link.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* Notifications */}
                            <button className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                            </button>

                            {/* Theme Toggle */}
                            <div className="flex items-center px-2">
                                <AnimatedDarkModeToggle
                                    isDark={theme === 'dark'}
                                    onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    size="sm"
                                />
                            </div>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                >
                                    <div
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                                        style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color || branding.primary_color})` }}
                                    >
                                        {user?.full_name?.charAt(0) || client?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                                            {client?.name || 'Client'}
                                        </p>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{client?.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        onNavigate?.('profile');
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                >
                                                    <User className="h-4 w-4" />
                                                    Profile Settings
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                    <HelpCircle className="h-4 w-4" />
                                                    Help & Support
                                                </button>
                                            </div>
                                            <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                                                <button
                                                    onClick={logout}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-[100] md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" />

                        {/* Drawer */}
                        <div
                            className="absolute top-0 right-0 h-full w-[280px] bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                                <span className="font-bold text-slate-900 dark:text-white">Menu</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
                                <nav className="space-y-1.5">
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
                                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                                                    ${isActive
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }
                                                `}
                                            >
                                                <Icon className="h-5 w-5" />
                                                {link.label}
                                            </button>
                                        );
                                    })}
                                </nav>

                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account</p>
                                    <button
                                        onClick={() => { onNavigate?.('profile'); setIsMobileMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <User className="h-5 w-5" />
                                        Profile Settings
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {branding.company_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{branding.company_name}</p>
                                        <p className="text-[10px] text-slate-500">v2.4.0</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Building2 className="h-4 w-4" />
                            <span>
                                {branding.footer_text || `© ${new Date().getFullYear()} ${branding.company_name}. All rights reserved.`}
                            </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                            {branding.support_email && (
                                <a
                                    href={`mailto:${branding.support_email}`}
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span>Support</span>
                                </a>
                            )}
                            {branding.support_phone && (
                                <a
                                    href={`tel:${branding.support_phone}`}
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                >
                                    {branding.support_phone}
                                </a>
                            )}
                            <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                Privacy
                            </a>
                            <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                Terms
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
