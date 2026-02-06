import React from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Badge } from '../../components/ui';
import {
    Calendar, AlertCircle, TrendingUp, TrendingDown, Users, Clock,
    CheckCircle2, Shield, ArrowUpRight, FileText, Activity,
    MapPin, Sparkles, ChevronRight, Eye, Zap
} from 'lucide-react';
import { hasFeature } from '../../lib/tiers';

export function ClientDashboard() {
    const { organization, client } = useClientPortalAuth();

    // Check tier permissions
    const tier = organization?.subscription_tier || 'basic';
    const canViewPatrolPaths = hasFeature(tier, 'patrol_paths');
    const canViewIncidentPhotos = hasFeature(tier, 'incident_photos');
    const canSubmitRequests = hasFeature(tier, 'service_requests');

    // Branding
    const branding = organization?.white_label || { primary_color: '#3b82f6' };

    // Mock data
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
            percentage: 93,
        },
        officerConsistency: {
            uniqueOfficers: 8,
            score: 'Good',
        },
    };

    const recentActivity = [
        { id: '1', type: 'checkpoint', time: '2 hours ago', description: 'North Gate checkpoint scanned', officer: 'M. Johnson', status: 'completed' },
        { id: '2', type: 'shift_complete', time: '4 hours ago', description: 'Evening patrol completed', officer: 'S. Williams', status: 'completed' },
        { id: '3', type: 'incident', time: '6 hours ago', description: 'Minor trespassing reported', officer: 'M. Johnson', status: 'resolved' },
        { id: '4', type: 'checkpoint', time: '8 hours ago', description: 'Parking structure sweep', officer: 'R. Davis', status: 'completed' },
    ];

    const upcomingShifts = [
        { id: '1', date: 'Today', time: '6:00 PM - 2:00 AM', site: 'Main Lobby', officer: 'Assigned' },
        { id: '2', date: 'Tomorrow', time: '6:00 AM - 2:00 PM', site: 'Parking Structure', officer: 'Assigned' },
        { id: '3', date: 'Tomorrow', time: '2:00 PM - 10:00 PM', site: 'Main Lobby', officer: 'Pending' },
    ];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'checkpoint': return <MapPin className="h-4 w-4" />;
            case 'shift_complete': return <CheckCircle2 className="h-4 w-4" />;
            case 'incident': return <AlertCircle className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'checkpoint': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case 'shift_complete': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
            case 'incident': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Welcome back</span>
                        <Badge variant="outline" className="text-xs">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Badge>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                        Security Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" style={{ color: branding.primary_color }} />
                        <span>Monitoring {client?.name || 'your property'}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-all shadow-sm">
                        <FileText className="h-4 w-4" />
                        Download Report
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all hover:opacity-90"
                        style={{
                            background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}dd)`,
                            boxShadow: `0 4px 14px ${branding.primary_color}40`
                        }}
                    >
                        <Zap className="h-4 w-4" />
                        New Request
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coverage Card */}
                <div className="group relative bg-card rounded-2xl border border-border/50 p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                                <CheckCircle2 className="h-6 w-6 text-white" />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                <TrendingUp className="h-3 w-3" />
                                On Track
                            </span>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Coverage This Month</p>
                        <p className="text-4xl font-black text-foreground mt-1">
                            {currentMonthStats.coverage.percentage}%
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {currentMonthStats.coverage.filled} of {currentMonthStats.coverage.total} shifts filled
                        </p>
                        <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${currentMonthStats.coverage.percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Incidents Card */}
                <div className="group relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <AlertCircle className="h-6 w-6 text-white" />
                            </div>
                            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${currentMonthStats.incidents.trend < 0
                                ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                                : 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
                                }`}>
                                {currentMonthStats.incidents.trend < 0
                                    ? <TrendingDown className="h-3 w-3" />
                                    : <TrendingUp className="h-3 w-3" />
                                }
                                {Math.abs(currentMonthStats.incidents.trend)} vs last month
                            </span>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Incidents This Month</p>
                        <p className="text-4xl font-black text-foreground mt-1">
                            {currentMonthStats.incidents.total}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {Object.entries(currentMonthStats.incidents.byType).map(([type, count]) => (
                                <span
                                    key={type}
                                    className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg capitalize"
                                >
                                    {type}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Officer Consistency Card */}
                <div className="group relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                                <Sparkles className="h-3 w-3" />
                                {currentMonthStats.officerConsistency.score}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Officer Familiarity</p>
                        <p className="text-4xl font-black text-foreground mt-1">
                            {currentMonthStats.officerConsistency.uniqueOfficers}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Unique officers this month
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Higher consistency = better tenant relationships
                        </p>
                    </div>
                </div>
            </div>

            {/* Activity & Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Recent Activity - Takes 3 columns */}
                <div className="lg:col-span-3 bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <div className="px-6 py-5 border-b border-border/20 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="h-5 w-5 text-slate-400" />
                            Recent Activity
                        </h2>
                        <button className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors">
                            View All
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-border/10">
                        {recentActivity.map((activity) => (
                            <div
                                key={activity.id}
                                className="px-6 py-4 flex items-start gap-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                            >
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${getActivityColor(activity.type)}`}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {activity.description}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                        <span>{activity.officer}</span>
                                        <span className="h-1 w-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                        <span>{activity.time}</span>
                                    </p>
                                </div>
                                <Badge
                                    variant={activity.status === 'completed' || activity.status === 'resolved' ? 'default' : 'secondary'}
                                    className="capitalize shrink-0"
                                >
                                    {activity.status}
                                </Badge>
                                <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Shifts - Takes 2 columns */}
                <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-400" />
                            Upcoming Coverage
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {upcomingShifts.map((shift) => (
                            <div key={shift.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {shift.date}
                                    </span>
                                    <Badge
                                        variant={shift.officer === 'Assigned' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {shift.officer}
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {shift.site}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {shift.time}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                        <button className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-2 transition-colors">
                            <Eye className="h-4 w-4" />
                            View Full Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Tier Upgrade Prompt */}
            {tier !== 'enterprise' && (
                <div
                    className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
                    style={{
                        background: `linear-gradient(135deg, ${branding.primary_color}15, ${branding.primary_color}05)`,
                        border: `1px solid ${branding.primary_color}30`
                    }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-50"
                        style={{ background: `radial-gradient(circle, ${branding.primary_color}20, transparent)` }}
                    />
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}cc)` }}
                            >
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Unlock More Features
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-lg">
                                    Upgrade to {tier === 'basic' ? 'Professional' : 'Enterprise'} to access
                                    {tier === 'basic'
                                        ? ' live patrol tracking, shift ratings, and incident photos'
                                        : ' custom white-labeling, advanced analytics, and dedicated support'
                                    }.
                                </p>
                            </div>
                        </div>
                        <button
                            className="px-6 py-3 rounded-xl font-semibold text-white shadow-lg hover:opacity-90 transition-all shrink-0"
                            style={{
                                background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}dd)`,
                                boxShadow: `0 4px 14px ${branding.primary_color}40`
                            }}
                        >
                            Upgrade Now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
