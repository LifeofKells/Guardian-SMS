import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    cn
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/db';
import type { Client, Officer, Shift, Site } from '../lib/types';
import {
    AlertTriangle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    Plus,
    RefreshCw,
    Shuffle,
    UserCheck,
    X,
    Sparkles,
    BarChart3,
    TrendingUp,
    LayoutGrid,
    Columns,
} from 'lucide-react';

interface EnrichedShift extends Shift {
    site?: Site & { client?: Client };
    officer?: Officer | null;
}

type ViewMode = 'month' | 'week';

const dateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function statusColor(isOpen: boolean, isDone: boolean) {
    if (isDone) return { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500', stripe: 'border-l-emerald-500' };
    if (isOpen) return { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500', stripe: 'border-l-amber-500' };
    return { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500', stripe: 'border-l-blue-500' };
}

// Shift chip for month grid cells
function ShiftChip({ shift }: { shift: EnrichedShift }) {
    const isOpen = !shift.officer_id;
    const isDone = shift.status === 'completed';
    const col = statusColor(isOpen, isDone);
    const startHour = new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', hour12: true });
    return (
        <div
            className={cn(
                'w-full truncate rounded-md px-1.5 py-[3px] text-[10px] font-semibold leading-tight flex items-center gap-1 transition-all cursor-pointer hover:opacity-80 border-l-2',
                col.badge, col.stripe
            )}
        >
            <span className="truncate">{shift.site?.name || 'Shift'}</span>
            <span className="ml-auto shrink-0 opacity-60">{startHour}</span>
        </div>
    );
}

// Richer shift chip for week column view
function WeekShiftChip({ shift, onClick }: { shift: EnrichedShift; onClick?: (e?: React.MouseEvent) => void }) {
    const isOpen = !shift.officer_id;
    const isDone = shift.status === 'completed';
    const col = statusColor(isOpen, isDone);
    return (
        <div
            onClick={onClick}
            className={cn(
                'w-full rounded-lg px-2 py-1.5 text-[10px] font-medium flex flex-col gap-0.5 transition-all cursor-pointer hover:opacity-80 border-l-2 border border-transparent',
                col.light, col.stripe, col.border
            )}
        >
            <span className="font-semibold truncate text-[11px]">{shift.site?.name || 'Shift'}</span>
            <span className="opacity-70">{timeLabel(shift.start_time)} – {timeLabel(shift.end_time)}</span>
            {shift.officer && (
                <span className="opacity-80 truncate">{shift.officer.full_name}</span>
            )}
            {isOpen && (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" /> Unassigned
                </span>
            )}
        </div>
    );
}

// Mini month for sidebar
function MiniMonth({ anchor, selectedDate, onSelectDate, onChangeMonth, shiftCountByDay }: {
    anchor: Date; selectedDate: Date | null;
    onSelectDate: (d: Date) => void;
    onChangeMonth: (dir: 1 | -1) => void;
    shiftCountByDay: Record<string, number>;
}) {
    const matrix = useMemo(() => {
        const year = anchor.getFullYear();
        const month = anchor.getMonth();
        const first = new Date(year, month, 1);
        const cells: (Date | null)[] = Array(first.getDay()).fill(null);
        const dim = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= dim; d++) cells.push(new Date(year, month, d));
        while (cells.length < 42) cells.push(null);
        return cells;
    }, [anchor]);

    const today = dateKey(new Date());
    return (
        <div className="select-none">
            <div className="flex items-center justify-between mb-3 px-0.5">
                <button onClick={() => onChangeMonth(-1)} className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-bold text-foreground">{SHORT_MONTHS[anchor.getMonth()]} {anchor.getFullYear()}</span>
                <button onClick={() => onChangeMonth(1)} className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 py-1">{d[0]}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {matrix.map((date, idx) => {
                    if (!date) return <div key={`e-${idx}`} />;
                    const key = dateKey(date);
                    const isToday = key === today;
                    const isSelected = selectedDate ? dateKey(selectedDate) === key : false;
                    const count = shiftCountByDay[key] || 0;
                    return (
                        <button
                            key={key}
                            onClick={() => onSelectDate(date)}
                            className={cn(
                                'relative flex flex-col items-center justify-center h-7 w-full rounded-lg text-[11px] font-medium transition-all duration-200',
                                isSelected ? 'bg-primary text-primary-foreground shadow-sm' :
                                    isToday ? 'bg-primary/10 text-primary font-bold' :
                                        'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <span>{date.getDate()}</span>
                            {count > 0 && !isSelected && (
                                <span className={cn('absolute bottom-1 h-0.5 w-3 rounded-full', isToday ? 'bg-primary/60' : 'bg-muted-foreground/25')} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SidebarStat({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full shrink-0', color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
        </div>
    );
}

// Week view — 7 column layout
function WeekGrid({ weekDates, shifts, today, selectedDate, onSelectDate, canEdit, onAddShift, monthShifts, statusFilter }: {
    weekDates: Date[];
    shifts: EnrichedShift[];
    today: string;
    selectedDate: Date | null;
    onSelectDate: (d: Date) => void;
    canEdit: boolean;
    onAddShift: (dateStr: string) => void;
    monthShifts: EnrichedShift[];
    statusFilter: string;
}) {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/40 bg-muted/20 shrink-0">
                {weekDates.map((date, i) => {
                    const key = dateKey(date);
                    const isToday = key === today;
                    const isSelected = selectedDate ? dateKey(selectedDate) === key : false;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                        <div key={key} className={cn(
                            'flex flex-col items-center py-2.5 cursor-pointer transition-all',
                            isSelected && 'bg-primary/10',
                            isWeekend && 'text-muted-foreground/50'
                        )} onClick={() => onSelectDate(date)}>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{DAYS[date.getDay()]}</span>
                            <span className={cn(
                                'mt-1 h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold transition-all',
                                isToday ? 'bg-primary text-primary-foreground' :
                                    isSelected ? 'bg-primary/15 text-primary' :
                                        'text-foreground/80 hover:bg-muted'
                            )}>{date.getDate()}</span>
                        </div>
                    );
                })}
            </div>
            {/* Columns */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto divide-x divide-border/25">
                {weekDates.map(date => {
                    const key = dateKey(date);
                    const dayShifts = monthShifts
                        .filter(s => dateKey(new Date(s.start_time)) === key)
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                    const isToday = key === today;
                    const isSelected = selectedDate ? dateKey(selectedDate) === key : false;
                    return (
                        <div key={key} className={cn(
                            'flex flex-col gap-1 p-1.5 min-h-0 relative group',
                            isSelected && 'bg-primary/[0.04]',
                            isToday && !isSelected && 'bg-primary/[0.03]',
                        )} onClick={() => onSelectDate(date)}>
                            {dayShifts.map(shift => (
                                <WeekShiftChip key={shift.id} shift={shift} onClick={() => onSelectDate(date)} />
                            ))}
                            {dayShifts.length === 0 && (
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-[10px] text-muted-foreground/25 font-medium">—</span>
                                </div>
                            )}
                            {canEdit && (
                                <button
                                    onClick={e => { e.stopPropagation(); onAddShift(key); }}
                                    className="absolute top-1 right-1 h-5 w-5 rounded-full items-center justify-center bg-primary text-primary-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-all hidden group-hover:flex z-10"
                                    title="New shift"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function CalendarView() {
    const { profile, organization } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const canEdit = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';

    const [anchor, setAnchor] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'assigned' | 'completed'>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createData, setCreateData] = useState({
        site_id: '', officer_id: '', date: dateKey(new Date()),
        start_time: '08:00', end_time: '16:00', break_duration: 30,
        pay_rate: '', bill_rate: '', status: 'published' as Shift['status'],
    });

    const { data: shifts = [], isLoading } = useQuery({
        queryKey: ['schedule', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data, error } = await db.getFullSchedule(organization.id);
            if (error) throw error;
            return (data as EnrichedShift[]) || [];
        },
    });

    const { data: officers = [] } = useQuery({
        queryKey: ['officers', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.officers.select(organization.id);
            return data || [];
        },
    });

    const { data: sites = [] } = useQuery({
        queryKey: ['sites', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.sites.select(organization.id);
            return data || [];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (row: Partial<Shift>) => { await db.shifts.create(row as any); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            setIsCreateOpen(false);
            addToast({ type: 'success', title: 'Shift created!' });
        },
        onError: () => addToast({ type: 'error', title: 'Failed to create shift.' }),
    });

    const autoAssignMutation = useMutation({
        mutationFn: async (shiftId: string) => {
            const active = officers.filter(o => o.employment_status === 'active');
            if (!active.length) throw new Error('No active officers');
            const pick = active[Math.floor(Math.random() * active.length)];
            const { error } = await db.shifts.update(shiftId, { officer_id: pick.id, status: 'assigned' });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule'] }),
    });

    const today = dateKey(new Date());
    const monthKey = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;

    const monthShifts = useMemo(() => {
        return shifts.filter(s => {
            const inMonth = dateKey(new Date(s.start_time)).startsWith(monthKey);
            if (!inMonth) return false;
            if (statusFilter === 'open') return !s.officer_id;
            if (statusFilter === 'assigned') return !!s.officer_id && s.status !== 'completed';
            if (statusFilter === 'completed') return s.status === 'completed';
            return true;
        });
    }, [shifts, monthKey, statusFilter]);

    const shiftCountByDay = useMemo(() => {
        const map: Record<string, number> = {};
        shifts.forEach(s => {
            const k = dateKey(new Date(s.start_time));
            map[k] = (map[k] || 0) + 1;
        });
        return map;
    }, [shifts]);

    const calendarMatrix = useMemo(() => {
        const year = anchor.getFullYear();
        const month = anchor.getMonth();
        const first = new Date(year, month, 1);
        const cells: (Date | null)[] = Array(first.getDay()).fill(null);
        const dim = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= dim; d++) cells.push(new Date(year, month, d));
        while (cells.length < 42) cells.push(null);
        return cells;
    }, [anchor]);

    // Week view: compute the 7 days of the week containing selectedDate (or anchor)
    const weekDates = useMemo(() => {
        const base = selectedDate || anchor;
        const dow = base.getDay();
        const sunday = new Date(base);
        sunday.setDate(base.getDate() - dow);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            return d;
        });
    }, [selectedDate, anchor]);

    // All shifts for the visible week (for week view filter)
    const weekShifts = useMemo(() => {
        const startKey = dateKey(weekDates[0]);
        const endKey = dateKey(weekDates[6]);
        return shifts.filter(s => {
            const k = dateKey(new Date(s.start_time));
            if (k < startKey || k > endKey) return false;
            if (statusFilter === 'open') return !s.officer_id;
            if (statusFilter === 'assigned') return !!s.officer_id && s.status !== 'completed';
            if (statusFilter === 'completed') return s.status === 'completed';
            return true;
        });
    }, [shifts, weekDates, statusFilter]);

    const dayShifts = useMemo(() => {
        if (!selectedDate) return [];
        const key = dateKey(selectedDate);
        return shifts
            .filter(s => dateKey(new Date(s.start_time)) === key)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [selectedDate, shifts]);

    const dayStats = useMemo(() => ({
        total: dayShifts.length,
        open: dayShifts.filter(s => !s.officer_id).length,
        assigned: dayShifts.filter(s => !!s.officer_id && s.status !== 'completed').length,
        completed: dayShifts.filter(s => s.status === 'completed').length,
    }), [dayShifts]);

    const monthStats = useMemo(() => ({
        total: monthShifts.length,
        open: monthShifts.filter(s => !s.officer_id).length,
        assigned: monthShifts.filter(s => !!s.officer_id && s.status !== 'completed').length,
        completed: monthShifts.filter(s => s.status === 'completed').length,
        coverage: monthShifts.length > 0
            ? Math.round((monthShifts.filter(s => !!s.officer_id).length / monthShifts.length) * 100) : 0,
    }), [monthShifts]);

    const handleCreate = () => {
        if (!organization || !createData.site_id) {
            addToast({ type: 'error', title: 'Please select a site.' });
            return;
        }
        createMutation.mutate({
            organization_id: organization.id,
            site_id: createData.site_id,
            officer_id: createData.officer_id || null,
            start_time: `${createData.date}T${createData.start_time}:00`,
            end_time: `${createData.date}T${createData.end_time}:00`,
            break_duration: createData.break_duration,
            pay_rate: createData.pay_rate ? parseFloat(createData.pay_rate) : null,
            bill_rate: createData.bill_rate ? parseFloat(createData.bill_rate) : null,
            status: createData.status,
        } as any);
    };

    const goToToday = () => {
        const now = new Date();
        setAnchor(now);
        setSelectedDate(now);
    };

    const changeMonth = (dir: 1 | -1) =>
        setAnchor(a => new Date(a.getFullYear(), a.getMonth() + dir, 1));

    const changeWeek = (dir: 1 | -1) => {
        const base = selectedDate || anchor;
        const next = new Date(base);
        next.setDate(base.getDate() + dir * 7);
        setSelectedDate(next);
        setAnchor(new Date(next.getFullYear(), next.getMonth(), 1));
    };

    const openAddShift = (dateStr?: string) => {
        setCreateData(p => ({ ...p, date: dateStr || (selectedDate ? dateKey(selectedDate) : today) }));
        setIsCreateOpen(true);
    };

    // ─────────────────────────────────────
    return (
        <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
            <div className="flex h-full">

                {/* ── LEFT SIDEBAR ── */}
                <aside className="hidden xl:flex flex-col w-[220px] shrink-0 border-r border-border/40 bg-muted/10 overflow-y-auto scrollbar-hide">
                    <div className="p-4 space-y-5">
                        <div className="rounded-xl border border-border/40 bg-card p-3">
                            <MiniMonth
                                anchor={anchor}
                                selectedDate={selectedDate}
                                onSelectDate={d => {
                                    setSelectedDate(d);
                                    setAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
                                }}
                                onChangeMonth={changeMonth}
                                shiftCountByDay={shiftCountByDay}
                            />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 flex items-center gap-1.5">
                                <BarChart3 className="h-3 w-3" /> This Month
                            </p>
                            <div className="rounded-xl border border-border/40 bg-card px-3 py-2 space-y-0.5">
                                <SidebarStat label="Total Shifts" value={monthStats.total} color="bg-muted-foreground/40" />
                                <SidebarStat label="Open" value={monthStats.open} color="bg-amber-500" />
                                <SidebarStat label="Assigned" value={monthStats.assigned} color="bg-blue-500" />
                                <SidebarStat label="Completed" value={monthStats.completed} color="bg-emerald-500" />
                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wide flex items-center gap-1">
                                            <TrendingUp className="h-2.5 w-2.5" /> Coverage
                                        </span>
                                        <span className="text-xs font-bold text-foreground">{monthStats.coverage}%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full transition-all duration-700',
                                                monthStats.coverage >= 90 ? 'bg-emerald-500' :
                                                    monthStats.coverage >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                                            )}
                                            style={{ width: `${monthStats.coverage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Filter</p>
                            <div className="rounded-xl border border-border/40 bg-card p-1.5 space-y-0.5">
                                {([
                                    { id: 'all', label: 'All Shifts', color: 'bg-muted-foreground/30' },
                                    { id: 'open', label: 'Open', color: 'bg-amber-500' },
                                    { id: 'assigned', label: 'Assigned', color: 'bg-blue-500' },
                                    { id: 'completed', label: 'Completed', color: 'bg-emerald-500' },
                                ] as const).map(({ id, label, color }) => (
                                    <button
                                        key={id}
                                        onClick={() => setStatusFilter(id)}
                                        className={cn(
                                            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200',
                                            statusFilter === id
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                        )}
                                    >
                                        <span className={cn('h-2 w-2 rounded-full shrink-0', color)} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {canEdit && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Actions</p>
                                <div className="space-y-1.5">
                                    <Button size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => openAddShift()}>
                                        <Plus className="h-3.5 w-3.5" /> New Shift
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full justify-start gap-2 h-8 text-xs" onClick={goToToday}>
                                        <Calendar className="h-3.5 w-3.5" /> Jump to Today
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── MAIN AREA ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* ── Toolbar ── */}
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-card shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Nav buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => viewMode === 'month' ? changeMonth(-1) : changeWeek(-1)}
                                    className="h-8 w-8 flex items-center justify-center rounded-xl border border-border/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => viewMode === 'month' ? changeMonth(1) : changeWeek(1)}
                                    className="h-8 w-8 flex items-center justify-center rounded-xl border border-border/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Title */}
                            <div>
                                {viewMode === 'month' ? (
                                    <>
                                        <h2 className="text-base font-bold text-foreground leading-none">
                                            {MONTHS[anchor.getMonth()]}
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">{anchor.getFullYear()}</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-base font-bold text-foreground leading-none">
                                            {weekDates[0].getDate()} {SHORT_MONTHS[weekDates[0].getMonth()]} – {weekDates[6].getDate()} {SHORT_MONTHS[weekDates[6].getMonth()]}
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">{weekDates[0].getFullYear()}</p>
                                    </>
                                )}
                            </div>

                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold ml-1" onClick={goToToday}>
                                Today
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* View mode toggle */}
                            <div className="flex items-center bg-muted/50 rounded-xl p-0.5 border border-border/30">
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={cn(
                                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                                        viewMode === 'month' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <LayoutGrid className="h-3 w-3" /> Month
                                </button>
                                <button
                                    onClick={() => setViewMode('week')}
                                    className={cn(
                                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                                        viewMode === 'week' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <Columns className="h-3 w-3" /> Week
                                </button>
                            </div>

                            {/* Mobile filter pills */}
                            <div className="flex xl:hidden items-center bg-muted/50 rounded-xl p-0.5 gap-0.5 border border-border/30">
                                {(['all', 'open', 'assigned', 'completed'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            'px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all',
                                            statusFilter === s ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {canEdit && (
                                <Button size="sm" className="h-8 gap-1.5 px-3 text-xs" onClick={() => openAddShift()}>
                                    <Plus className="h-3.5 w-3.5" /> New Shift
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* ── Calendar / Day Lens ── */}
                    <div className="flex flex-1 min-h-0 overflow-hidden">

                        {/* Grid area */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <RefreshCw className="h-6 w-6 animate-spin opacity-20" />
                                    <span className="text-sm font-medium opacity-50">Loading shifts…</span>
                                </div>
                            ) : viewMode === 'month' ? (
                                <>
                                    {/* Day-of-week headers */}
                                    <div className="grid grid-cols-7 border-b border-border/40 bg-muted/20 shrink-0">
                                        {DAYS.map((d, i) => (
                                            <div key={d} className={cn(
                                                'py-2.5 text-center text-[10px] font-bold uppercase tracking-widest',
                                                i === 0 || i === 6 ? 'text-muted-foreground/40' : 'text-muted-foreground/70'
                                            )}>
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-y divide-border/30 overflow-hidden">
                                        {calendarMatrix.map((date, idx) => {
                                            if (!date) {
                                                return <div key={`empty-${idx}`} className="bg-muted/[0.07] border-r border-border/25 last:border-r-0" />;
                                            }
                                            const key = dateKey(date);
                                            const dayRows = monthShifts.filter(s => dateKey(new Date(s.start_time)) === key);
                                            const allDayRows = shifts.filter(s => dateKey(new Date(s.start_time)) === key);
                                            const openCount = allDayRows.filter(s => !s.officer_id).length;
                                            const isToday = key === today;
                                            const isSelected = selectedDate ? dateKey(selectedDate) === key : false;
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            const isOtherMonth = date.getMonth() !== anchor.getMonth();
                                            return (
                                                <div
                                                    key={key}
                                                    onClick={() => setSelectedDate(isSelected ? null : date)}
                                                    className={cn(
                                                        'relative flex flex-col min-h-0 border-r border-border/25 last:border-r-0 cursor-pointer transition-all duration-200 group overflow-hidden',
                                                        isSelected ? 'bg-primary/[0.07] ring-inset ring-1 ring-primary/40' :
                                                            isToday ? 'bg-primary/[0.04]' :
                                                                isWeekend ? 'bg-muted/[0.12]' :
                                                                    'bg-background hover:bg-muted/30',
                                                        isOtherMonth && 'opacity-35'
                                                    )}
                                                >
                                                    {isToday && !isSelected && (
                                                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
                                                    )}
                                                    <div className="flex items-center justify-between px-2 pt-2 pb-1 shrink-0">
                                                        <span className={cn(
                                                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all',
                                                            isToday ? 'bg-primary text-primary-foreground shadow-sm' :
                                                                isSelected ? 'text-primary font-bold' :
                                                                    isWeekend ? 'text-muted-foreground/50' :
                                                                        'text-foreground/80 group-hover:text-foreground'
                                                        )}>
                                                            {date.getDate()}
                                                        </span>
                                                        {allDayRows.length > 0 && (
                                                            <span className={cn(
                                                                'text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums',
                                                                openCount > 0
                                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                                            )}>
                                                                {allDayRows.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="px-1.5 pb-1.5 space-y-0.5 flex-1 overflow-hidden">
                                                        {dayRows.slice(0, 3).map(shift => (
                                                            <ShiftChip key={shift.id} shift={shift} />
                                                        ))}
                                                        {dayRows.length > 3 && (
                                                            <div className="text-[9px] text-muted-foreground/50 pl-1 font-semibold">
                                                                +{dayRows.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                    {canEdit && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); openAddShift(key); }}
                                                            className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full items-center justify-center bg-primary text-primary-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-all hidden group-hover:flex"
                                                            title="New shift"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <WeekGrid
                                    weekDates={weekDates}
                                    shifts={shifts}
                                    today={today}
                                    selectedDate={selectedDate}
                                    onSelectDate={setSelectedDate}
                                    canEdit={canEdit}
                                    onAddShift={openAddShift}
                                    monthShifts={weekShifts}
                                    statusFilter={statusFilter}
                                />
                            )}
                        </div>

                        {/* ── DAY LENS PANEL ── */}
                        {selectedDate && (
                            <div className="w-[290px] xl:w-[310px] shrink-0 flex flex-col border-l border-border/40 bg-card/80 backdrop-blur-xl overflow-hidden animate-in slide-in-from-right-4 duration-300 ease-out">
                                <div className="p-4 border-b border-border/40 shrink-0 bg-gradient-to-br from-card to-muted/10">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-1">
                                                {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
                                            </p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-bold leading-none text-foreground">{selectedDate.getDate()}</p>
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    {selectedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            {dateKey(selectedDate) === today && (
                                                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                                    <Sparkles className="h-2.5 w-2.5" /> Today
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSelectedDate(null)}
                                            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Stats row */}
                                    <div className="grid grid-cols-4 gap-2 mt-3">
                                        {[
                                            { label: 'Total', val: dayStats.total, cls: 'text-foreground', bg: 'bg-muted/60' },
                                            { label: 'Open', val: dayStats.open, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                                            { label: 'Set', val: dayStats.assigned, cls: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                            { label: 'Done', val: dayStats.completed, cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                        ].map(({ label, val, cls, bg }) => (
                                            <div key={label} className={cn('flex flex-col items-center py-2 rounded-xl', bg)}>
                                                <span className={cn('text-base font-bold tabular-nums leading-tight', cls)}>{val}</span>
                                                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60 font-bold mt-0.5">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 24h Timeline */}
                                {dayStats.total > 0 && (
                                    <div className="px-4 py-3 border-b border-border/40 shrink-0 bg-muted/5">
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-2">Timeline</p>
                                        <div className="relative h-8 rounded-xl bg-muted/60 overflow-hidden">
                                            {dayShifts.map((shift, idx) => {
                                                const s = new Date(shift.start_time);
                                                const e = new Date(shift.end_time);
                                                const sMin = s.getHours() * 60 + s.getMinutes();
                                                const eRaw = e.getHours() * 60 + e.getMinutes();
                                                const eMin = e <= s ? eRaw + 1440 : eRaw;
                                                const left = (sMin / 1440) * 100;
                                                const width = Math.max(((eMin - sMin) / 1440) * 100, 4);
                                                const isOpen = !shift.officer_id;
                                                const isDone = shift.status === 'completed';
                                                return (
                                                    <div
                                                        key={shift.id}
                                                        className={cn('absolute rounded-md opacity-80', {
                                                            'bg-emerald-500': isDone,
                                                            'bg-amber-400': isOpen,
                                                            'bg-blue-500': !isOpen && !isDone,
                                                        })}
                                                        style={{ left: `${left}%`, width: `${width}%`, top: idx % 2 === 0 ? '4px' : '18px', height: '10px' }}
                                                        title={`${shift.site?.name} — ${timeLabel(shift.start_time)}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/40 font-medium">
                                            {['12a', '6a', '12p', '6p', '12a'].map(t => <span key={t}>{t}</span>)}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {canEdit && (
                                    <div className="flex gap-2 px-4 py-3 border-b border-border/40 shrink-0">
                                        <Button size="sm" className="flex-1 h-8 gap-1.5 text-xs" onClick={() => openAddShift()}>
                                            <Plus className="h-3.5 w-3.5" /> Add Shift
                                        </Button>
                                        {dayStats.open > 0 && (
                                            <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5 text-xs" onClick={() => {
                                                dayShifts.filter(s => !s.officer_id).forEach(s => autoAssignMutation.mutate(s.id));
                                            }}>
                                                <UserCheck className="h-3.5 w-3.5" /> Auto Assign
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Shift list */}
                                <div className="flex-1 overflow-y-auto scrollbar-hide">
                                    {dayShifts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground gap-3 px-4">
                                            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                <Calendar className="h-7 w-7 opacity-25" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-semibold">No shifts scheduled</p>
                                                <p className="text-xs text-muted-foreground/60 mt-1">
                                                    {canEdit ? 'Click "Add Shift" to schedule one.' : 'Nothing planned for this day.'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 space-y-2">
                                            {dayShifts.map(shift => {
                                                const isOpen = !shift.officer_id;
                                                const isDone = shift.status === 'completed';
                                                const col = statusColor(isOpen, isDone);
                                                return (
                                                    <div
                                                        key={shift.id}
                                                        className={cn(
                                                            'relative rounded-xl border p-3 group transition-all duration-200 cursor-default overflow-hidden',
                                                            col.light, col.border
                                                        )}
                                                    >
                                                        <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-r-sm', col.bg)} />
                                                        <div className="pl-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-foreground truncate">{shift.site?.name || 'Unknown Site'}</p>
                                                                    {shift.site?.client && (
                                                                        <p className="text-[10px] text-muted-foreground truncate">{shift.site.client.name}</p>
                                                                    )}
                                                                </div>
                                                                <span className={cn('inline-flex shrink-0 items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide', col.badge)}>
                                                                    {isDone ? 'Done' : isOpen ? 'Open' : 'Active'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                <Clock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                                                <span className="text-xs text-muted-foreground font-medium">
                                                                    {timeLabel(shift.start_time)} – {timeLabel(shift.end_time)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                {shift.officer ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                                                                            {shift.officer.full_name[0]}
                                                                        </div>
                                                                        <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">
                                                                            {shift.officer.full_name}
                                                                        </span>
                                                                        {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                                                    </div>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                                        <AlertTriangle className="h-3 w-3 shrink-0" /> Unassigned
                                                                    </span>
                                                                )}
                                                                {isOpen && canEdit && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); autoAssignMutation.mutate(shift.id); }}
                                                                        className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-bold"
                                                                    >
                                                                        <Shuffle className="h-2.5 w-2.5" /> Auto
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CREATE SHIFT DIALOG ── */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Plus className="h-4 w-4 text-primary" />
                            </div>
                            New Shift — {createData.date}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-1">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Date</Label>
                                <Input type="date" value={createData.date}
                                    onChange={e => setCreateData(p => ({ ...p, date: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Status</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    value={createData.status}
                                    onChange={e => setCreateData(p => ({ ...p, status: e.target.value as any }))}
                                >
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Site *</Label>
                            <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={createData.site_id}
                                onChange={e => setCreateData(p => ({ ...p, site_id: e.target.value }))}
                            >
                                <option value="">Select a site…</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Officer (optional)</Label>
                            <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={createData.officer_id}
                                onChange={e => setCreateData(p => ({ ...p, officer_id: e.target.value }))}
                            >
                                <option value="">Unassigned</option>
                                {officers.filter(o => o.employment_status === 'active').map(o => (
                                    <option key={o.id} value={o.id}>{o.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Start Time</Label>
                                <Input type="time" value={createData.start_time}
                                    onChange={e => setCreateData(p => ({ ...p, start_time: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">End Time</Label>
                                <Input type="time" value={createData.end_time}
                                    onChange={e => setCreateData(p => ({ ...p, end_time: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Pay Rate ($/hr)</Label>
                                <Input placeholder="0.00" value={createData.pay_rate}
                                    onChange={e => setCreateData(p => ({ ...p, pay_rate: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Bill Rate ($/hr)</Label>
                                <Input placeholder="0.00" value={createData.bill_rate}
                                    onChange={e => setCreateData(p => ({ ...p, bill_rate: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating…' : 'Create Shift'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
