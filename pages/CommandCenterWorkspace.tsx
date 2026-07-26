import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, Input, cn
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/db';
import {
  Activity, AlertTriangle, BarChart3, Briefcase, CalendarDays, Clock,
  DollarSign, FileText, Loader2,
  ShieldAlert, ShieldCheck, TrendingUp,
  Users, Wallet
} from 'lucide-react';
import {
  AreaChart, Area, BarChart as ReBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toFixed(0)}`;

const fmtNum = (n: number) =>
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);


const dateKey = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Animated counter for numbers ──────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1000, formatFn }: {
  value: number;
  duration?: number;
  formatFn?: (n: number) => string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = count;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing function: easeOutExpo
      const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easing * (value - startValue) + startValue;
      setCount(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{formatFn ? formatFn(count) : Math.floor(count)}</span>;
}

// ── Donut chart for workforce status ──────────────────────────────────────────
const DONUT_COLORS = ['#10b981', '#3b82f6', '#94a3b8'];

function WorkforceDonut({ active, onboarding, terminated }: {
  active: number; onboarding: number; terminated: number;
}) {
  const data = [
    { name: 'Active', value: active },
    { name: 'Onboarding', value: onboarding },
    { name: 'Terminated', value: terminated },
  ];
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <PieChart width={160} height={160}>
          <Pie
            data={data}
            cx={75}
            cy={75}
            innerRadius={52}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i]} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold leading-none">{active + onboarding}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">Officers</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i] }} />
            <div>
              <p className="text-xs text-muted-foreground leading-none">{d.name}</p>
              <p className="text-sm font-bold leading-tight mt-0.5">{d.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CommandCenterWorkspace({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { organization } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'workforce' | 'finance' | 'risk'>('overview');
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isTimesheetQueueOpen, setIsTimesheetQueueOpen] = useState(false);
  const [newShift, setNewShift] = useState({ site_id: '', officer_id: '', date: '', start: '09:00', end: '17:00' });
  const [newIncident, setNewIncident] = useState({
    site_id: '', officer_id: '',
    type: 'other' as 'theft' | 'vandalism' | 'injury' | 'trespassing' | 'other',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    description: ''
  });

  // ── Data fetching ──
  const { data: shifts = [] } = useQuery({
    queryKey: ['cc-shifts', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.getFullSchedule(organization.id);
      return data || [];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['cc-incidents', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.getFullIncidents(organization.id);
      return data || [];
    },
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['cc-time', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.getFullTimeEntries(organization.id);
      return data || [];
    },
  });

  const { data: officers = [] } = useQuery({
    queryKey: ['cc-officers', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.officers.select(organization.id);
      return data || [];
    },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['cc-sites', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.sites.select(organization.id);
      return data || [];
    },
  });

  // ── Time references ──
  const now = new Date();

  // ── Computed KPIs ──
  const activeForce = useMemo(() =>
    (timeEntries as any[]).filter(e => !e.clock_out).length,
    [timeEntries]);

  const openIncidents = useMemo(() =>
    (incidents as any[]).filter(i => i.status !== 'closed'),
    [incidents]);

  const weekHours = useMemo(() => {
    const cutoff = now.getTime() - 7 * 86400000;
    return (timeEntries as any[])
      .filter(e => new Date(e.clock_in || e.start_time || 0).getTime() >= cutoff && e.total_hours)
      .reduce((s: number, e: any) => s + (e.total_hours || 0), 0);
  }, [timeEntries]);

  const estRevenue = useMemo(() => {
    const cutoff = now.getTime() - 7 * 86400000;
    return (timeEntries as any[])
      .filter(e => new Date(e.clock_in || e.start_time || 0).getTime() >= cutoff)
      .reduce((s: number, e: any) => {
        const rate = e.shift?.bill_rate || 25;
        return s + (e.total_hours || 0) * rate;
      }, 0);
  }, [timeEntries]);

  const pendingTimesheets = useMemo(() =>
    (timeEntries as any[]).filter(e => e.status === 'pending'),
    [timeEntries]);

  // ── 7-day trend data ──
  const trend7 = useMemo(() => {
    const days: { date: string; Shifts: number; Incidents: number; Hours: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = dateKey(d);
      const shiftCount = (shifts as any[]).filter(s => {
        const t = new Date(s.start_time).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      const incidentCount = (incidents as any[]).filter(s => {
        const t = new Date(s.reported_at || s.created_at || 0).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      const hrs = (timeEntries as any[])
        .filter(e => {
          const t = new Date(e.clock_in || e.start_time || 0).getTime();
          return t >= d.getTime() && t < next.getTime();
        })
        .reduce((s: number, e: any) => s + (e.total_hours || 0), 0);
      days.push({ date: label, Shifts: shiftCount, Incidents: incidentCount, Hours: Math.round(hrs) });
    }
    return days;
  }, [shifts, incidents, timeEntries]);

  // ── Workforce donut data ──
  const wfActive = (officers as any[]).filter(o => o.employment_status === 'active').length;
  const wfOnboard = (officers as any[]).filter(o => o.employment_status === 'onboarding').length;
  const wfTerminated = (officers as any[]).filter(o => o.employment_status === 'terminated').length;

  // ── Workforce tab KPIs ──
  const totalRoster = (officers as any[]).length;
  const onDuty = (timeEntries as any[]).filter((e: any) => !e.clock_out).length;
  const utilization = totalRoster ? Math.round((onDuty / totalRoster) * 100) : 0;

  const activePersonnel = useMemo(() =>
    (timeEntries as any[]).filter((e: any) => !e.clock_out).slice(0, 10),
    [timeEntries]);

  const next24hShifts = useMemo(() => {
    const cutoff = Date.now() + 86400000;
    return (shifts as any[])
      .filter(s => new Date(s.start_time).getTime() > Date.now() && new Date(s.start_time).getTime() < cutoff)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 10);
  }, [shifts]);

  // ── Finance tab computed ──
  const estPayroll = useMemo(() => {
    const cutoff = now.getTime() - 7 * 86400000;
    return (timeEntries as any[])
      .filter(e => new Date(e.clock_in || e.start_time || 0).getTime() >= cutoff)
      .reduce((s: number, e: any) => s + (e.total_hours || 0) * (e.shift?.pay_rate || 20), 0);
  }, [timeEntries]);

  const estMargin = estRevenue - estPayroll;
  const marginPct = estRevenue ? Math.round((estMargin / estRevenue) * 100) : 0;

  const financeChart = useMemo(() =>
    trend7.map(d => ({
      date: d.date,
      Revenue: Math.round(d.Hours * 25),
      Payroll: Math.round(d.Hours * 20),
    })),
    [trend7]);

  // ── Risk tab computed ──
  const totalIncidentsWTD = useMemo(() => {
    const cutoff = now.getTime() - 7 * 86400000;
    return (incidents as any[]).filter(i =>
      new Date(i.reported_at || i.created_at || 0).getTime() >= cutoff
    ).length;
  }, [incidents]);

  const recentIncidents = useMemo(() =>
    (incidents as any[])
      .filter(i => i.status !== 'closed')
      .sort((a, b) => new Date(b.reported_at || b.created_at || 0).getTime() - new Date(a.reported_at || a.created_at || 0).getTime())
      .slice(0, 8),
    [incidents]);

  const highRiskSites = useMemo(() => {
    const map: Record<string, { name: string; address: string; count: number }> = {};
    (incidents as any[]).filter(i => i.status !== 'closed').forEach(i => {
      const id = i.site_id;
      if (!id) return;
      if (!map[id]) map[id] = { name: i.site?.name || 'Unknown Site', address: i.site?.address || '', count: 0 };
      map[id].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [incidents]);

  // ── Mutations ──
  const createShiftMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error();
      const { error } = await db.shifts.create({
        organization_id: organization.id,
        site_id: newShift.site_id,
        officer_id: newShift.officer_id || null,
        start_time: `${newShift.date}T${newShift.start}:00`,
        end_time: `${newShift.date}T${newShift.end}:00`,
        status: newShift.officer_id ? 'assigned' : 'published',
        break_duration: 30,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsShiftOpen(false);
      setNewShift({ site_id: '', officer_id: '', date: '', start: '09:00', end: '17:00' });
      queryClient.invalidateQueries({ queryKey: ['cc-shifts'] });
      addToast({ type: 'success', title: 'Shift Created' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to create shift' }),
  });

  const createIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!organization || !newIncident.site_id || !newIncident.officer_id) throw new Error();
      const { error } = await db.incidents.create({
        organization_id: organization.id,
        ...newIncident,
        reported_at: new Date().toISOString(),
        status: 'open',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsIncidentOpen(false);
      setNewIncident({ site_id: '', officer_id: '', type: 'other', severity: 'medium', description: '' });
      queryClient.invalidateQueries({ queryKey: ['cc-incidents'] });
      addToast({ type: 'success', title: 'Incident logged' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to log incident' }),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(pendingTimesheets.slice(0, 20).map((e: any) =>
        db.time_entries.update(e.id, { status: 'approved' })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cc-time'] });
      setIsTimesheetQueueOpen(false);
      addToast({ type: 'success', title: 'Timesheets approved' });
    },
    onError: () => addToast({ type: 'error', title: 'Approval failed' }),
  });

  // ── Severity badge helper ──
  const severityBadge = (s?: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    if (s === 'high') return 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    if (s === 'medium') return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Greeting header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {greeting}, {organization?.name || 'there'} 👋
          </h1>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm text-muted-foreground">All systems operational</p>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          {/* Tab nav */}
          <nav className="flex items-center border-b border-slate-200">
            {(['overview', 'workforce', 'finance', 'risk'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 pb-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px',
                  activeTab === tab
                    ? 'border-teal-500 text-slate-900'
                    : 'border-transparent text-muted-foreground hover:text-slate-700 hover:border-slate-300'
                )}
              >
                {tab === 'risk' ? 'Risk & Ops' : tab}
              </button>
            ))}
          </nav>
          <Button
            size="sm"
            className="gap-1.5 text-xs mb-px"
            onClick={() => onNavigate('schedule')}
          >
            <Activity className="h-3 w-3" />
            Live Monitor
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* 4 KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hoverLift={true} className="group overflow-hidden relative border-l-4 border-l-blue-500">
              <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active Force</p>
                    <p className="text-3xl font-bold mt-1.5 tracking-tight text-slate-900">
                      <AnimatedCounter value={activeForce} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Officers clocked in</p>
                  </div>
                  <span className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Users className="h-4.5 w-4.5 text-blue-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn('group overflow-hidden relative border-l-4', openIncidents.length > 0 ? 'border-l-red-500' : 'border-l-emerald-500')}>
              <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Open Incidents</p>
                    <p className={cn('text-3xl font-bold mt-1.5 tracking-tight', openIncidents.length > 0 ? 'text-red-600' : 'text-slate-900')}>
                      <AnimatedCounter value={openIncidents.length} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{openIncidents.length > 0 ? 'Requires attention' : 'All clear'}</p>
                  </div>
                  <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', openIncidents.length > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                    <ShieldAlert className={cn('h-4.5 w-4.5', openIncidents.length > 0 ? 'text-red-600' : 'text-emerald-600')} />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative border-l-4 border-l-violet-500">
              <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Weekly Hours</p>
                    <p className="text-3xl font-bold mt-1.5 tracking-tight text-slate-900">
                      <AnimatedCounter value={weekHours} formatFn={fmtNum} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Billable time logged</p>
                  </div>
                  <span className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <Clock className="h-4.5 w-4.5 text-violet-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative border-l-4 border-l-teal-500">
              <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Est. Revenue</p>
                    <p className="text-3xl font-bold mt-1.5 tracking-tight text-slate-900">
                      <AnimatedCounter value={estRevenue} formatFn={fmt} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Current week projection</p>
                  </div>
                  <span className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4.5 w-4.5 text-teal-600" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
            <Card hoverLift={true} className="overflow-hidden relative group">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">7-Day Activity Trend</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trend7} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Shifts" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="Incidents" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.12} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="overflow-hidden relative group">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Workforce Status</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center pb-4">
                <WorkforceDonut active={wfActive} onboarding={wfOnboard} terminated={wfTerminated} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          WORKFORCE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'workforce' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Total Roster</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={totalRoster} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Registered Officers</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">On Duty</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={onDuty} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Currently clocked in</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Utilization</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={utilization} formatFn={(v) => `${Math.round(v)}%`} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Active / Total</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Activity className="h-5 w-5 text-amber-600" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden relative group">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Active Personnel</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-4">
                {activePersonnel.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No Officers On Duty</p>
                    <p className="text-xs text-muted-foreground mt-1">Officers will appear here when they clock in for their shifts.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {activePersonnel.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                          {e.officer?.full_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.officer?.full_name || 'Officer'}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.shift?.site?.name || 'On duty'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative group">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Upcoming Shifts (Next 24h)</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-4">
                {next24hShifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No Upcoming Shifts</p>
                    <p className="text-xs text-muted-foreground mt-1">Shifts scheduled for the next 24 hours will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {next24hShifts.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.site?.name || 'Site'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {s.officer?.full_name ? ` · ${s.officer.full_name}` : ' · Unassigned'}
                          </p>
                        </div>
                        {!s.officer_id && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                            Open
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FINANCE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'finance' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Est. Revenue (WTD)</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={estRevenue} formatFn={fmt} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Based on billable hours</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Est. Payroll (WTD)</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={estPayroll} formatFn={fmt} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Based on clock-ins</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="h-5 w-5 text-amber-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Est. Margin</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={Math.max(0, estMargin)} formatFn={fmt} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <AnimatedCounter value={marginPct} formatFn={(v) => `${Math.round(v)}%`} /> Margin
                    </p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden relative group">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Daily Financial Performance</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={280}>
                <ReBarChart data={financeChart} margin={{ top: 5, right: 16, left: -10, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="Payroll" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </ReBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RISK & OPS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'risk' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className={cn('border-border/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group', openIncidents.length > 0 && 'border-red-200 dark:border-red-900/40')}>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Open Incidents</p>
                    <p className={cn('text-3xl font-bold mt-1', openIncidents.length > 0 ? 'text-red-600' : '')}>
                      <AnimatedCounter value={openIncidents.length} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Pending Investigation</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverLift={true} className="group overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Total Incidents (WTD)</p>
                    <p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">
                      <AnimatedCounter value={totalIncidentsWTD} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">All categories</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">High Risk Sites</p>
                    <p className="text-3xl font-bold mt-1 text-red-600">
                      <AnimatedCounter value={highRiskSites.length} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Requiring increased patrol</p>
                  </div>
                  <span className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Recent Incident Log</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2 max-h-[420px] overflow-y-auto">
                {recentIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <ShieldCheck className="h-10 w-10 text-emerald-400 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No open incidents</p>
                    <p className="text-xs text-muted-foreground mt-1">All incidents have been resolved.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {recentIncidents.map((i: any) => (
                      <div key={i.id} className="px-5 py-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', severityBadge(i.severity))}>
                            {i.severity || 'low'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(i.reported_at || i.created_at || '').toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize mt-1">
                          {i.type || 'incident'} Incident at {i.site?.name || 'Unknown Site'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {i.description || `Incident reported at ${i.site?.name || 'site'}. Routine patrol discovered anomaly.`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">High Risk Locations</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2 max-h-[420px] overflow-y-auto">
                {highRiskSites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <ShieldCheck className="h-10 w-10 text-emerald-400 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No high-risk locations</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {highRiskSites.map((site, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-5 py-3">
                        <span className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{site.name}</p>
                          {site.address && <p className="text-xs text-muted-foreground truncate">{site.address}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs shrink-0"
                          onClick={() => onNavigate('clients')}
                        >
                          Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      {/* Create Shift */}
      <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Shift</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Site *</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newShift.site_id}
                onChange={e => setNewShift(p => ({ ...p, site_id: e.target.value }))}
              >
                <option value="">Select site…</option>
                {(sites as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Officer (optional)</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newShift.officer_id}
                onChange={e => setNewShift(p => ({ ...p, officer_id: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {(officers as any[]).map((o: any) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" className="mt-1" value={newShift.date} onChange={e => setNewShift(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="time" className="mt-1" value={newShift.start} onChange={e => setNewShift(p => ({ ...p, start: e.target.value }))} /></div>
              <div><Label>End</Label><Input type="time" className="mt-1" value={newShift.end} onChange={e => setNewShift(p => ({ ...p, end: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShiftOpen(false)}>Cancel</Button>
            <Button onClick={() => createShiftMutation.mutate()} disabled={createShiftMutation.isPending || !newShift.site_id || !newShift.date}>
              {createShiftMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Incident */}
      <Dialog open={isIncidentOpen} onOpenChange={setIsIncidentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Site *</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newIncident.site_id}
                onChange={e => setNewIncident(p => ({ ...p, site_id: e.target.value }))}
              >
                <option value="">Select site…</option>
                {(sites as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Reporting Officer *</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newIncident.officer_id}
                onChange={e => setNewIncident(p => ({ ...p, officer_id: e.target.value }))}
              >
                <option value="">Select officer…</option>
                {(officers as any[]).map((o: any) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newIncident.type}
                  onChange={e => setNewIncident(p => ({ ...p, type: e.target.value as any }))}
                >
                  {['theft', 'vandalism', 'injury', 'trespassing', 'other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <Label>Severity</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newIncident.severity}
                  onChange={e => setNewIncident(p => ({ ...p, severity: e.target.value as any }))}
                >
                  {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                value={newIncident.description}
                onChange={e => setNewIncident(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the incident…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIncidentOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createIncidentMutation.mutate()}
              disabled={createIncidentMutation.isPending || !newIncident.site_id || !newIncident.officer_id}
            >
              {createIncidentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timesheet Queue */}
      <Dialog open={isTimesheetQueueOpen} onOpenChange={setIsTimesheetQueueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Pending Timesheet Queue</DialogTitle></DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto rounded-md border">
            {pendingTimesheets.slice(0, 20).map((e: any) => (
              <div key={e.id} className="p-3 border-b last:border-b-0 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{e.officer?.full_name || 'Officer'} · {e.shift?.site?.name || 'Site'}</p>
                  <p className="text-xs text-muted-foreground">{(e.total_hours || 0).toFixed(1)} hours</p>
                </div>
                <Button size="sm" variant="outline"
                  onClick={() => db.time_entries.update(e.id, { status: 'approved' })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['cc-time'] }))}>
                  Approve
                </Button>
              </div>
            ))}
            {pendingTimesheets.length === 0 && <p className="p-4 text-sm text-muted-foreground">No pending timesheets.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimesheetQueueOpen(false)}>Close</Button>
            <Button onClick={() => bulkApproveMutation.mutate()}
              disabled={bulkApproveMutation.isPending || pendingTimesheets.length === 0}>
              {bulkApproveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve All Visible
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
