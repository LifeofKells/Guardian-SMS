import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import {
    User, Mail, Phone, Lock, Bell, Globe,
    Shield, Camera, Save, LogOut, CheckCircle2,
    Building2, MapPin, Key, ShieldCheck, Sparkles, RefreshCw
} from 'lucide-react';

export function ClientProfile() {
    const { user, client, organization, logout } = useClientPortalAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [notifications, setNotifications] = useState({
        incident_alerts: true,
        daily_digest: true,
        billing_notices: false,
        sms_dispatch: true,
    });

    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || 'Primary Client Executive',
        phone: '+1 (555) 019-2834',
        title: 'VP of Facility Operations & Security',
        address: '123 Corporate Plaza, Suite 500, San Francisco, CA'
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert('Profile Settings successfully saved.');
        }, 600);
    };

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 lg:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ENTERPRISE IDENTITY VAULT
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                            Account & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Security Credentials</span>
                        </h1>
                        <p className="text-sm text-slate-300 max-w-xl">
                            Manage authorized portal contacts, site escalation phone lines, and automated real-time dispatch alerts.
                        </p>
                    </div>

                    <button
                        onClick={logout}
                        className="px-5 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20 shadow-lg flex items-center gap-2 shrink-0 active:scale-95"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out of Portal
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Identity & Security Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 lg:p-8 text-center relative overflow-hidden shadow-2xl">
                        <div className="h-24 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 -mx-8 -mt-8 mb-6 border-b border-white/10" />

                        <div className="relative -mt-16 mb-4 inline-block">
                            <div className="h-24 w-24 rounded-3xl bg-slate-950 border-4 border-slate-900 shadow-2xl flex items-center justify-center overflow-hidden mx-auto">
                                <span className="text-3xl font-black text-blue-400">
                                    {user?.full_name?.charAt(0) || 'C'}
                                </span>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-white">{profileData.full_name}</h3>
                        <p className="text-xs font-mono text-blue-400 mt-1">{client?.name || 'Enterprise Security Client'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{profileData.title}</p>

                        <div className="mt-6 pt-6 border-t border-white/[0.08] space-y-3">
                            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold w-fit mx-auto">
                                <ShieldCheck className="h-4 w-4" />
                                Tier 1 Authorized Client
                            </div>

                            <div className="text-[11px] font-mono text-slate-400">
                                Client Reference ID: <span className="text-white">{client?.id || 'CLI-84920'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-xl">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portal Access Key</h4>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                                <span>Multi-Factor Authentication</span>
                                <span className="text-emerald-400 font-bold">ACTIVE</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Biometric single sign-on enabled via Organization Workspace.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings Form */}
                <div className="lg:col-span-8 space-y-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Personal Contact Info */}
                        <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 lg:p-8 space-y-6 shadow-xl">
                            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Authorized Contact Information</h3>
                                    <p className="text-xs text-slate-400">Primary point of contact for emergency dispatches</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full h-12 rounded-xl bg-slate-950 border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                        value={profileData.full_name}
                                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Title</label>
                                    <input
                                        type="text"
                                        className="w-full h-12 rounded-xl bg-slate-950 border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                        value={profileData.title}
                                        onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Portal Email (Read Only)</label>
                                    <input
                                        type="email"
                                        disabled
                                        className="w-full h-12 rounded-xl bg-slate-950/60 border border-white/5 px-4 text-xs font-mono text-slate-400 cursor-not-allowed"
                                        value={user?.email || 'client@enterprise.com'}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Escalation Phone Line</label>
                                    <input
                                        type="text"
                                        className="w-full h-12 rounded-xl bg-slate-950 border border-white/10 px-4 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notification Preferences */}
                        <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 lg:p-8 space-y-6 shadow-xl">
                            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Security Alerts & Broadcast Preferences</h3>
                                    <p className="text-xs text-slate-400">Control immediate notifications for incidents & reports</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { key: 'incident_alerts', label: 'Urgent Incident Notifications', desc: 'Receive instant alerts whenever a Level 2+ security incident is logged at your site.' },
                                    { key: 'daily_digest', label: 'Automated Daily Officer Activity Summary', desc: 'Receive an automated daily email digest of guard shifts and completed checkpoints.' },
                                    { key: 'billing_notices', label: 'Monthly Billing & Service Invoices', desc: 'Automated digital PDF copies of monthly service invoices delivered to your inbox.' },
                                    { key: 'sms_dispatch', label: 'SMS Dispatch Escalations', desc: 'Allow direct SMS phone pings when a guard on duty requests immediate supervisor escalation.' },
                                ].map((item) => {
                                    const isChecked = notifications[item.key as keyof typeof notifications];
                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => toggleNotification(item.key as any)}
                                            className="p-4 rounded-2xl bg-slate-950 border border-white/5 hover:border-white/10 transition-all cursor-pointer flex items-center justify-between gap-4"
                                        >
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-white">{item.label}</p>
                                                <p className="text-xs text-slate-400">{item.desc}</p>
                                            </div>

                                            <div className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${isChecked ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                                <div className={`h-4 w-4 rounded-full bg-white transition-transform absolute top-1 ${isChecked ? 'left-6' : 'left-1'}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Save Action Bar */}
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xl hover:opacity-95 transition-all flex items-center gap-2 border border-white/20 active:scale-95"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Updating Profile...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Profile Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

