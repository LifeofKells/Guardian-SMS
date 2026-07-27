import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import {
    FileText, Download, Calendar, Search, Filter,
    ChevronRight, BarChart3, Clock, Shield, AlertTriangle, Zap,
    FileCheck, CheckCircle2, Sparkles, ArrowDownToLine, RefreshCw,
    SlidersHorizontal, Eye, FolderKanban
} from 'lucide-react';

export function ClientReportsHub() {
    const { organization, client } = useClientPortalAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const branding = organization?.white_label || {
        primary_color: '#3b82f6',
    };

    // Mock Reports Data
    const reports = [
        {
            id: 'REP-2026-088',
            name: 'Monthly Security Audit & Risk Assessment - May 2026',
            type: 'monthly',
            date: '2026-06-01',
            status: 'ready',
            size: '3.4 MB',
            category: 'Activity Summary',
            downloads: 14,
            site: 'HQ Complex & West Campus'
        },
        {
            id: 'REP-2026-072',
            name: 'Incident Response & Resolution Matrix - Q2 2026',
            type: 'quarterly',
            date: '2026-05-15',
            status: 'ready',
            size: '2.1 MB',
            category: 'Analytics',
            downloads: 8,
            site: 'All Client Sites'
        },
        {
            id: 'REP-2026-065',
            name: 'Officer Guard Performance & Consistency Metric',
            type: 'custom',
            date: '2026-05-10',
            status: 'processing',
            size: 'Compiling...',
            category: 'Operations',
            downloads: 0,
            site: 'Logistics Facility 4'
        },
        {
            id: 'REP-2026-041',
            name: 'Perimeter Checkpoint Scan Density Analysis',
            type: 'weekly',
            date: '2026-05-08',
            status: 'ready',
            size: '1.2 MB',
            category: 'Maintenance',
            downloads: 22,
            site: 'East Plaza Annex'
        },
        {
            id: 'REP-2026-029',
            name: 'Vendor Access & Escort Log Report',
            type: 'weekly',
            date: '2026-04-30',
            status: 'ready',
            size: '890 KB',
            category: 'Operations',
            downloads: 5,
            site: 'HQ Complex'
        }
    ];

    const stats = [
        { label: 'Total Verified Reports', value: '54', icon: FileText, desc: 'Archived security records' },
        { label: 'Generated This Month', value: '14', icon: BarChart3, desc: '98% automated delivery' },
        { label: 'Secure Storage Used', value: '210 MB', icon: Shield, desc: 'Encrypted Cloud Storage' },
    ];

    const categories = ['all', 'Activity Summary', 'Analytics', 'Operations', 'Maintenance'];

    const filteredReports = reports.filter(r => {
        const matchesQuery = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.site.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
        return matchesQuery && matchesCat;
    });

    const handleDownload = (id: string) => {
        setDownloadingId(id);
        setTimeout(() => {
            setDownloadingId(null);
            alert(`Report ${id} downloaded successfully!`);
        }, 1000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Architectural Header */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 lg:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                COMPLIANCE & ARCHIVES
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                                Client: <strong className="text-white">{client?.name || 'Verified Client'}</strong>
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                            Reports & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Analytics Vault</span>
                        </h1>
                        <p className="text-sm text-slate-300 max-w-xl">
                            Download compliance audits, officer checkpoint verification logs, and monthly risk assessments generated for your organization.
                        </p>
                    </div>

                    <button
                        onClick={() => alert('Custom report compilation request sent to your account manager.')}
                        className="px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-100 transition-all shadow-xl flex items-center gap-2 shrink-0 border border-white/20 active:scale-95"
                    >
                        <Sparkles className="h-4 w-4 text-blue-600 fill-blue-600" />
                        Request Custom Audit
                    </button>
                </div>
            </div>

            {/* Stats Grid (Glass Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={i}
                            className="group relative bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 hover:border-blue-500/40 transition-all duration-500 shadow-xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                            <div className="relative flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                    <Icon className="h-7 w-7" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                                    <h3 className="text-3xl font-black text-white mt-0.5">{stat.value}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mt-1">{stat.desc}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-900/90 p-4 rounded-3xl border border-white/[0.08]">
                {/* Search Bar */}
                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by report name, ID, or site location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reports Roster Table Container */}
            <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.08] bg-slate-950/40 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-blue-400" />
                            Security Reports Library
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Showing {filteredReports.length} available security documents</p>
                    </div>

                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10">
                        Format: High-Res PDF
                    </span>
                </div>

                <div className="divide-y divide-white/[0.06]">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className="p-6 hover:bg-white/[0.03] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {report.name}
                                        </h4>
                                        {report.status === 'processing' ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                                Compiling Data
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Ready for Download
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono pt-1">
                                        <span className="text-blue-400 font-bold">{report.id}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {report.date}
                                        </span>
                                        <span>•</span>
                                        <span>Facility: {report.site}</span>
                                        <span>•</span>
                                        <span className="text-slate-300 font-bold">{report.size}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                                <button
                                    onClick={() => handleDownload(report.id)}
                                    disabled={report.status === 'processing' || downloadingId === report.id}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${report.status === 'processing'
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                            : downloadingId === report.id
                                                ? 'bg-blue-600 text-white animate-pulse'
                                                : 'bg-slate-950 hover:bg-slate-800 text-white border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {downloadingId === report.id ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <ArrowDownToLine className="h-4 w-4 text-blue-400" />
                                            Download PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredReports.length === 0 && (
                    <div className="p-12 text-center space-y-3">
                        <Search className="h-10 w-10 text-slate-600 mx-auto" />
                        <h3 className="text-lg font-bold text-white">No Matching Reports</h3>
                        <p className="text-xs text-slate-400">Try adjusting your search criteria or category filter.</p>
                    </div>
                )}
            </div>

            {/* Automation Digest Tip */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-white/10 p-8 shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <Zap className="h-7 w-7 fill-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Automated Weekly Security Digests</h3>
                            <p className="text-xs text-slate-300 mt-1 max-w-lg">
                                Receive automated weekly incident breakdown summaries delivered directly to your management team's email inbox every Monday at 08:00 AM.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.hash = '#/portal/profile'}
                        className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors shrink-0"
                    >
                        Configure Delivery Rules
                    </button>
                </div>
            </div>
        </div>
    );
}

