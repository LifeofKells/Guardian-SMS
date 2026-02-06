import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import {
    FileText, Download, Calendar, Search, Filter,
    ChevronRight, BarChart3, Clock, Shield, AlertTriangle, Zap
} from 'lucide-react';

export function ClientReportsHub() {
    const { organization, client } = useClientPortalAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const branding = organization?.white_label || {
        primary_color: '#3b82f6',
    };

    // Mock Reports Data
    const reports = [
        {
            id: 'REP-2024-001',
            name: 'Monthly Security Summary - May 2024',
            type: 'monthly',
            date: '2024-06-01',
            status: 'ready',
            size: '2.4 MB',
            category: 'Activity Summary'
        },
        {
            id: 'REP-2024-002',
            name: 'Incident Analysis Report - Q2',
            type: 'quarterly',
            date: '2024-05-15',
            status: 'ready',
            size: '1.8 MB',
            category: 'Analytics'
        },
        {
            id: 'REP-2024-003',
            name: 'Officer Performance & Consistency',
            type: 'custom',
            date: '2024-05-10',
            status: 'processing',
            size: '--',
            category: 'Operations'
        },
        {
            id: 'REP-2024-004',
            name: 'Site Inspection Report - West Wing',
            type: 'weekly',
            date: '2024-05-08',
            status: 'ready',
            size: '950 KB',
            category: 'Maintenance'
        }
    ];

    const stats = [
        { label: 'Total Reports', value: '48', icon: FileText, color: 'blue' },
        { label: 'Generated This Month', value: '12', icon: BarChart3, color: 'emerald' },
        { label: 'Storage Used', value: '156 MB', icon: Shield, color: 'indigo' },
    ];

    const filteredReports = reports.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports Hub</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Access and download your security operational reports and analytics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-lg">
                        Request Custom Report
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={i} className="group hover:shadow-xl transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-slate-500/5 dark:bg-slate-400/5 rounded-full" />
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 dark:bg-${stat.color}-500/20`}>
                                        <Icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search reports by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none gap-2 rounded-xl">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    <Button variant="outline" className="flex-1 md:flex-none gap-2 rounded-xl">
                        <Calendar className="h-4 w-4" />
                        Last 30 Days
                    </Button>
                </div>
            </div>

            {/* Reports List */}
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                    <CardTitle className="text-lg">Available Reports</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredReports.map((report) => (
                            <div key={report.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            {report.name}
                                            {report.status === 'processing' && (
                                                <Badge variant="warning" className="animate-pulse">Processing</Badge>
                                            )}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5 uppercase text-[10px] font-bold tracking-wider">
                                                ID: {report.id}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {report.date}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {report.type}
                                            </span>
                                            <span className="font-medium text-slate-400">{report.size}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={report.status === 'processing'}
                                        className="h-9 px-4 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredReports.length === 0 && (
                        <div className="p-12 text-center">
                            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No reports found</h3>
                            <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Automation Tip */}
            <div className={`p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 text-white shadow-xl relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 bg-white/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shrink-0">
                        <Zap className="h-8 w-8 text-yellow-400 shadow-glow" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold">Automated Reporting</h3>
                        <p className="text-slate-300 mt-1">
                            Every Monday, we generate a comprehensive weekly security summary for all your sites.
                            You can configure automated email delivery in your profile settings.
                        </p>
                    </div>
                    <Button className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8">
                        Configure
                    </Button>
                </div>
            </div>
        </div>
    );
}
