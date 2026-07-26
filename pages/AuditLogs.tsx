import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';
import { AuditLog } from '../lib/types';
import { Search, Filter, Radio, Minimize2, Maximize2, Sparkles, Download, Clock3 } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

type TimeRange = '24h' | '7d' | '30d' | 'all';
type SortOrder = 'newest' | 'oldest';

const getRangeCutoff = (range: TimeRange) => {
    const now = Date.now();
    if (range === '24h') return now - 24 * 60 * 60 * 1000;
    if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000;
    if (range === '30d') return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
};

const highlightText = (text: string, query: string) => {
    const term = query.trim();
    if (!term) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-amber-200/70 text-foreground px-0.5 rounded-sm">{text.slice(idx, idx + term.length)}</mark>
            {text.slice(idx + term.length)}
        </>
    );
};

export default function AuditLogs() {
    const { organization } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [filterResource, setFilterResource] = useState('all');
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isCompact = density === 'compact';
    const cellX = isCompact ? 'px-4' : 'px-6';
    const cellY = isCompact ? 'py-2.5' : 'py-3';

    useEffect(() => {
        if (!organization) return;
        setIsLoading(true);
        const unsubscribe = db.audit_logs.subscribe(organization.id, (data) => {
            setLogs(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [organization]);

    const resources = useMemo(() => {
        const set = new Set<string>(logs.map((log) => String(log.target_resource || '')).filter(Boolean));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [logs]);

    const filteredLogs = useMemo(() => {
        const cutoff = getRangeCutoff(timeRange);
        const filtered = logs.filter((log) => {
            const matchesSearch =
                log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.target_resource.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction = filterAction === 'all' || log.action === filterAction;
            const matchesResource = filterResource === 'all' || log.target_resource === filterResource;
            const matchesRange = cutoff === 0 || new Date(log.timestamp).getTime() >= cutoff;
            return matchesSearch && matchesAction && matchesResource && matchesRange;
        });

        filtered.sort((a, b) => {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
        });

        return filtered;
    }, [logs, searchTerm, filterAction, filterResource, timeRange, sortOrder]);

    const stats = useMemo(() => {
        const total = filteredLogs.length;
        return {
            total,
            create: filteredLogs.filter((l) => l.action === 'create').length,
            update: filteredLogs.filter((l) => l.action === 'update').length,
            risk: filteredLogs.filter((l) => l.action === 'delete' || l.action === 'process').length
        };
    }, [filteredLogs]);

    const getActionColor = (action: string) => {
        if (action === 'create') return 'success';
        if (action === 'update') return 'default';
        if (action === 'delete') return 'destructive';
        if (action === 'process') return 'warning';
        return 'secondary';
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterAction('all');
        setFilterResource('all');
        setTimeRange('7d');
        setSortOrder('newest');
    };

    const exportCsv = () => {
        const rows = filteredLogs.map((log) => [
            new Date(log.timestamp).toISOString(),
            log.performed_by,
            log.action,
            log.target_resource,
            log.target_id || '',
            log.description.replace(/\"/g, '""')
        ]);
        const csv = [
            ['timestamp', 'performed_by', 'action', 'resource', 'target_id', 'description'],
            ...rows
        ]
            .map((row) => row.map((cell) => `"${String(cell)}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Logs</h1>
                    <p className="text-sm text-muted-foreground">Track critical system events with action, scope, and operator context.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={filteredLogs.length === 0}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                    <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
                        <button
                            onClick={() => setDensity('compact')}
                            className={isCompact ? 'p-1.5 rounded-md bg-secondary shadow-sm' : 'p-1.5 rounded-md text-muted-foreground hover:bg-muted'}
                            title="Compact density"
                        >
                            <Minimize2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setDensity('comfortable')}
                            className={!isCompact ? 'p-1.5 rounded-md bg-secondary shadow-sm' : 'p-1.5 rounded-md text-muted-foreground hover:bg-muted'}
                            title="Comfortable density"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 bg-background text-emerald-600 border-emerald-200">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Live Stream
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Visible Events</p>
                        <p className="text-2xl font-bold mt-1">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Create</p>
                        <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.create}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Update</p>
                        <p className="text-2xl font-bold mt-1 text-blue-600">{stats.update}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Delete/Process</p>
                        <p className="text-2xl font-bold mt-1 text-amber-600">{stats.risk}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-border">
                <CardHeader className="bg-muted/30 border-b border-border py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-3">
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by user, resource, or description"
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                            title="Time range"
                        >
                            <option value="24h">Last 24h</option>
                            <option value="7d">Last 7d</option>
                            <option value="30d">Last 30d</option>
                            <option value="all">All time</option>
                        </select>

                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            title="Action filter"
                        >
                            <option value="all">All Actions</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="process">Process</option>
                        </select>

                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={filterResource}
                            onChange={(e) => setFilterResource(e.target.value)}
                            title="Resource filter"
                        >
                            <option value="all">All Resources</option>
                            {resources.map((resource) => (
                                <option key={resource} value={resource}>{resource}</option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-10" onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}>
                                <Clock3 className="h-4 w-4 mr-2" /> {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-10" onClick={resetFilters}>Reset</Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="rounded-none border-0 overflow-x-auto max-h-[68vh]">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                                <tr>
                                    <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground w-[180px]`}>Timestamp</th>
                                    <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground w-[220px]`}>User</th>
                                    <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground w-[120px]`}>Action</th>
                                    <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground w-[140px]`}>Resource</th>
                                    <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground animate-pulse">
                                            Connecting to live feed...
                                        </td>
                                    </tr>
                                )}

                                {!isLoading && filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                        <td className={`${cellX} ${cellY} text-muted-foreground whitespace-nowrap text-xs font-mono`}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className={`${cellX} ${cellY} font-medium`}>
                                            <div className="flex items-center gap-2">
                                                <div className={isCompact ? 'h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600' : 'h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600'}>
                                                    {log.performed_by.charAt(0)}
                                                </div>
                                                <span className="truncate max-w-[170px]">{highlightText(log.performed_by, searchTerm)}</span>
                                            </div>
                                        </td>
                                        <td className={`${cellX} ${cellY}`}>
                                            <Badge variant={getActionColor(log.action) as any} className="uppercase text-[10px] w-20 justify-center">
                                                {log.action}
                                            </Badge>
                                        </td>
                                        <td className={`${cellX} ${cellY}`}>
                                            <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-1 rounded w-fit">
                                                <Filter className="h-3 w-3" /> {highlightText(log.target_resource, searchTerm)}
                                            </div>
                                        </td>
                                        <td className={`${cellX} ${cellY} text-foreground/80`}>
                                            {highlightText(log.description, searchTerm)}
                                            {log.target_id && <span className="ml-2 font-mono text-[10px] text-muted-foreground opacity-60">#{log.target_id.substring(0, 6)}</span>}
                                        </td>
                                    </tr>
                                ))}

                                {!isLoading && filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8">
                                            {logs.length === 0 ? (
                                                <EmptyState
                                                    icon={Sparkles}
                                                    title="No Audit Activities"
                                                    description="System events will be logged here as they occur."
                                                    variant="onboarding"
                                                    size="sm"
                                                />
                                            ) : (
                                                <EmptyState
                                                    icon={Search}
                                                    title="No matching logs"
                                                    description="Try adjusting your time range or filters."
                                                    action={{
                                                        label: "Reset Filters",
                                                        onClick: resetFilters,
                                                        icon: Filter
                                                    }}
                                                    size="sm"
                                                />
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
