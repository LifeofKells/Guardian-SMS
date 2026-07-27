import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Badge } from '../../components/ui';
import {
    Calendar, AlertCircle, TrendingUp, TrendingDown, Users, Clock,
    CheckCircle2, Shield, ArrowUpRight, FileText, Activity,
    MapPin, Sparkles, ChevronRight, Eye, Zap, Search, RefreshCw,
    Check, AlertTriangle, ShieldCheck, UserCheck, ArrowRight, Building2
} from 'lucide-react';
import { hasFeature } from '../../lib/tiers';

export function ClientDashboard() {
    const { organization, client } = useClientPortalAuth();
    const [selectedActivityFilter, setSelectedActivityFilter] = useState('all');

    // Check tier permissions
    const tier = organization?.subscription_tier || 'basic';
    const canViewPatrolPaths = hasFeature(tier, 'patrol_paths');
    const canViewIncidentPhotos = hasFeature(tier, 'incident_photos');
    const canSubmitRequests = hasFeature(tier, 'service_requests');

    // Branding
    const branding = organization?.white_label || { primary_color: '#3b82f6' };

    // Mock operational stats
    const currentMonthStats = {
        incidents: {
            total: 7,
            trend: -2,
            byType: {
                trespassing: 3,
                medical: 1,
                theft: 0,
                other: 3,
            },
        },
        coverage: {
            filled: 28,
            total: 30,
            percentage: 93.3,
            patrolsCompleted: 142,
            checkpointsScanned: 854,
        },
        officerConsistency: {
            uniqueOfficers: 8,
            score: '98.5% High Trust',
            topOfficer: 'Marcus Johnson',
        },
    };

    const recentActivity = [
        { id: '1', type: 'checkpoint', time: '12m ago', title: 'North Perimeter Scan', description: 'North Gate checkpoint scanned & verified', officer: 'M. Johnson', avatar: 'MJ', status: 'completed', site: 'HQ Complex' },
        { id: '2', type: 'shift_complete', time: '2h ago', title: 'Morning Shift Dispatch', description: 'Full perimeter sweep completed without anomalies', officer: 'S. Williams', avatar: 'SW', status: 'completed', site: 'West Logistics' },
        { id: '3', type: 'incident', time: '5h ago', title: 'Visitor Escort Logged', description: 'Vendor access verified & escorted to Server Room B', officer: 'M. Johnson', avatar: 'MJ', status: 'resolved', site: 'HQ Complex' },
        { id: '4', type: 'checkpoint', time: '7h ago', title: 'Parking Structure Sweep', description: 'Structure B levels 1-4 cleared, all access doors locked', officer: 'R. Davis', avatar: 'RD', status: 'completed', site: 'East Annex' },
    ];

    const upcomingShifts = [
        { id: '1', date: 'Today', time: '18:00 - 02:00', site: 'Corporate HQ - Main Lobby', officer: 'Marcus Johnson', status: 'On Duty' },
        { id: '2', date: 'Tomorrow', time: '06:00 - 14:00', site: 'Westside Logistics Gate 4', officer: 'Sarah Williams', status: 'Confirmed' },
        { id: '3', date: 'Tomorrow', time: '14:00 - 22:00', site: 'Corporate HQ - East Plaza', officer: 'Robert Davis', status: 'Assigned' },
    ];

    const filteredActivities = selectedActivityFilter === 'all'
        ? recentActivity
        : recentActivity.filter(a => a.type === selectedActivityFilter);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Operational Status Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 lg:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                OPERATIONAL HEALTH: OPTIMAL
                            </span>
                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1 font-mono">
                                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                            Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Command Center</span>
                        </h1>

                        <p className="text-sm sm:text-base text-slate-300 font-light max-w-2xl leading-relaxed">
                            Active oversight for <strong className="text-white font-semibold">{client?.name || 'Your Facilities'}</strong>. Real-time shift verification, checkpoint logging, and incident response tracking.
                        </p>
                    </div>

                    {/* Quick Command Actions */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
                        <button
                            onClick={() => window.location.hash = '#/portal/reports'}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-3.5 bg-slate-950/80 hover:bg-slate-800 border border-white/10 rounded-2xl text-xs font-bold text-slate-200 transition-all shadow-lg hover:border-white/20 active:scale-95"
                        >
                            <FileText className="h-4 w-4 text-blue-400" />
                            Download Summary
                        </button>
                        <button
                            onClick={() => window.location.hash = '#/portal/requests'}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:opacity-95 active:scale-95 border border-white/20"
                            style={{
                                background: `linear-gradient(135deg, ${branding.primary_color}, #4f46e5)`,
                            }}
                        >
                            <Zap className="h-4 w-4 fill-white" />
                            New Service Request
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Operational Metrics (Obsidian Widgets) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric 1: Shift Coverage */}
                <div className="group relative bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 hover:border-blue-500/40 transition-all duration-500 shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {currentMonthStats.coverage.percentage}% Guaranteed
                            </span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Shift Coverage Rate</p>
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className="text-4xl font-black text-white">{currentMonthStats.coverage.filled}</span>
                            <span className="text-sm font-semibold text-slate-400">/ {currentMonthStats.coverage.total} shifts filled</span>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/[0.06] p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                                    style={{ width: `${currentMonthStats.coverage.percentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[11px] font-medium text-slate-400 pt-1">
                                <span>{currentMonthStats.coverage.patrolsCompleted} Patrol Sweeps</span>
                                <span className="text-blue-400">{currentMonthStats.coverage.checkpointsScanned} Scans</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metric 2: Incident Trends */}
                <div className="group relative bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 hover:border-emerald-500/40 transition-all duration-500 shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <TrendingDown className="h-3.5 w-3.5" />
                                -28% vs Last Month
                            </span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Security Incidents</p>
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className="text-4xl font-black text-white">{currentMonthStats.incidents.total}</span>
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">100% Resolved</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            {Object.entries(currentMonthStats.incidents.byType).map(([type, count]) => (
                                <span
                                    key={type}
                                    className="text-[11px] font-bold px-2.5 py-1 bg-slate-950 border border-white/10 text-slate-300 rounded-lg capitalize"
                                >
                                    {type}: <strong className="text-white">{count}</strong>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Metric 3: Guard Roster Consistency */}
                <div className="group relative bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 hover:border-purple-500/40 transition-all duration-500 shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                <Users className="h-6 w-6" />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                                <Sparkles className="h-3.5 w-3.5" />
                                High Continuity
                            </span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Guard Roster</p>
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className="text-4xl font-black text-white">{currentMonthStats.officerConsistency.uniqueOfficers}</span>
                            <span className="text-sm font-semibold text-slate-400">Dedicated Officers</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/[0.06]">
                            <div className="flex -space-x-2 overflow-hidden">
                                {['MJ', 'SW', 'RD', 'AL', 'KT'].map((initials, idx) => (
                                    <div key={idx} className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
                                        {initials}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[11px] font-bold text-purple-400">Lead: {currentMonthStats.officerConsistency.topOfficer}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity & Shift Roster Two-Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Column 1: Live Operational Activity (3 Cols) */}
                <div className="lg:col-span-3 bg-slate-900/90 rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-400" />
                                Real-Time Operations Feed
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Live checkpoint logs & shift events</p>
                        </div>

                        {/* Quick Filter Pills */}
                        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                            {['all', 'checkpoint', 'shift_complete', 'incident'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setSelectedActivityFilter(filter)}
                                    className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all ${selectedActivityFilter === filter
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {filter === 'shift_complete' ? 'Shifts' : filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-white/[0.06] flex-1">
                        {filteredActivities.map((act) => (
                            <div
                                key={act.id}
                                className="p-5 hover:bg-white/[0.03] transition-all flex items-start justify-between gap-4 group cursor-pointer"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
                                        {act.avatar}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                                {act.title}
                                            </h4>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-white/5">
                                                {act.site}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            {act.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                                            <span className="font-semibold text-slate-300">Guard: {act.officer}</span>
                                            <span>•</span>
                                            <span className="font-mono text-slate-400">{act.time}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        {act.status}
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-white/[0.08] bg-slate-950/60 text-center">
                        <button
                            onClick={() => window.location.hash = '#/portal/reports'}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                        >
                            View Full Incident Log & Activity History <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Column 2: Scheduled Coverage Roster (2 Cols) */}
                <div className="lg:col-span-2 bg-slate-900/90 rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/[0.08] bg-slate-950/40">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-indigo-400" />
                            Upcoming Shift Schedule
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Assigned security officers for your sites</p>
                    </div>

                    <div className="p-4 space-y-3 flex-1">
                        {upcomingShifts.map((shift) => (
                            <div
                                key={shift.id}
                                className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.06] hover:border-white/20 transition-all space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                                        {shift.date}
                                    </span>
                                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        {shift.time}
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-white truncate">{shift.site}</h4>
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                        <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                                        {shift.officer}
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-400">{shift.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 border-t border-white/[0.08] bg-slate-950/60">
                        <button
                            onClick={() => window.location.hash = '#/portal/instructions'}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
                        >
                            <Building2 className="h-4 w-4 text-indigo-400" />
                            Review Site Operating Protocols
                        </button>
                    </div>
                </div>
            </div>

            {/* Enterprise Service Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 p-8 shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full">
                            Custom Client Customization
                        </span>
                        <h3 className="text-2xl font-black text-white">Need Dedicated On-Site Officers or Patrol Vehicles?</h3>
                        <p className="text-sm text-slate-300 max-w-xl">
                            Request additional guard personnel, VIP escorts, or customized site post orders directly through your account manager.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.hash = '#/portal/requests'}
                        className="px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-100 transition-all shadow-xl shrink-0 flex items-center gap-2"
                    >
                        Submit Custom Request <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

