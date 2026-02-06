import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Badge } from '../../components/ui';
import {
    User, Mail, Phone, Lock, Bell, Globe,
    Shield, Camera, Save, LogOut, CheckCircle2,
    Building2, MapPin, Key
} from 'lucide-react';

export function ClientProfile() {
    const { user, client, organization, logout } = useClientPortalAuth();
    const [isSaving, setIsSaving] = useState(false);

    const branding = organization?.white_label || {
        primary_color: '#3b82f6',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage your account information, security preferences, and notification settings.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left: Quick Info */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="h-24 bg-gradient-to-r from-slate-900 to-indigo-900" />
                            <div className="px-6 pb-6 text-center">
                                <div className="relative -mt-12 mb-4 inline-block">
                                    <div className="h-24 w-24 rounded-3xl bg-white border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center overflow-hidden">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                            <div
                                                className="h-full w-full flex items-center justify-center text-white text-3xl font-bold"
                                                style={{ backgroundColor: branding.primary_color }}
                                            >
                                                {user?.full_name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-slate-500 hover:text-blue-500 transition-colors">
                                        <Camera className="h-4 w-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user?.full_name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{client?.name}</p>

                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                                    <Badge variant="success" className="w-fit mx-auto gap-1.5 border-0">
                                        <Shield className="h-3 w-3" />
                                        Account Verified
                                    </Badge>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Member Since 2024</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start gap-3 rounded-xl border-slate-200 dark:border-slate-800">
                            <Key className="h-4 w-4 text-slate-400" />
                            Change Password
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-3 rounded-xl border-slate-200 dark:border-slate-800 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={logout}>
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Right: Detailed Settings */}
                <div className="md:col-span-8 space-y-6">
                    {/* Account Information */}
                    <Card className="border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-500" />
                                Account Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input defaultValue={user?.full_name} className="pl-10 rounded-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input defaultValue={user?.email} disabled className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-900" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input defaultValue="+1 (555) 0123-4567" className="pl-10 rounded-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Job Title</Label>
                                    <Input defaultValue="Facility Manager" className="rounded-xl" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Company Details */}
                    <Card className="border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-emerald-500" />
                                Company Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input defaultValue={client?.name} disabled className="rounded-xl bg-slate-50 dark:bg-slate-900" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Primary Office Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input defaultValue="123 Corporate Plaza, Suite 500" className="pl-10 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Preferences */}
                    <Card className="border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Bell className="h-5 w-5 text-amber-500" />
                                Notification Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {[
                                { title: 'Incident Alerts', desc: 'Real-time notifications for critical incidents at your sites.', active: true },
                                { title: 'Operational Summaries', desc: 'Weekly automated reports and activity summaries.', active: true },
                                { title: 'Invoicing & Billing', desc: 'Digital delivery of invoices and payment confirmations.', active: false },
                                { title: 'Marketing & Product', desc: 'New feature announcements and platform updates.', active: false },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                                    </div>
                                    <button
                                        className={`h-6 w-11 rounded-full transition-colors relative ${item.active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                                        onClick={() => { }}
                                    >
                                        <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform absolute top-1 ${item.active ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Save Actions */}
                    <div className="flex items-center justify-end gap-3 pt-6">
                        <Button variant="ghost" className="rounded-xl">Cancel</Button>
                        <Button
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-8 rounded-xl h-11 shadow-xl shadow-slate-900/10"
                            onClick={() => setIsSaving(true)}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Save className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {isSaving && (
                <div className="fixed bottom-8 right-8 animate-in slide-in-from-right duration-300">
                    <Badge variant="success" className="p-4 pr-6 rounded-2xl shadow-2xl border-0 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Success!</span>
                            <span className="text-xs opacity-90">Your profile has been updated.</span>
                        </div>
                    </Badge>
                </div>
            )}
        </div>
    );
}
