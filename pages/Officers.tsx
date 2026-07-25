import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/db';
import type { Certification, Officer } from '../lib/types';
import {
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

type DirectoryView = 'roster' | 'workload' | 'table';
type SortBy = 'name' | 'upcoming' | 'hours' | 'incidents';

const EMPLOYMENT_STATUSES: Array<{ value: Officer['employment_status']; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'terminated', label: 'Terminated' }
];

/* ── helpers ── */
function complianceState(expiryIso: string): 'ok' | 'expiring' | 'expired' {
  const now = Date.now();
  const expiry = new Date(expiryIso).getTime();
  if (expiry < now) return 'expired';
  if (expiry < now + 30 * 24 * 60 * 60 * 1000) return 'expiring';
  return 'ok';
}

function statusMeta(s: Officer['employment_status']) {
  if (s === 'active') return { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Active' };
  if (s === 'onboarding') return { dot: 'bg-amber-500', badge: 'bg-amber-500/10   text-amber-600   dark:text-amber-400   border-amber-500/20', label: 'Onboarding' };
  return { dot: 'bg-red-500', badge: 'bg-red-500/10     text-red-600     dark:text-red-400     border-red-500/20', label: 'Terminated' };
}

/* ── small sub-components ── */
function CompliancePill({ state }: { state: 'ok' | 'expiring' | 'expired' }) {
  if (state === 'expired') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"><AlertTriangle className="h-2.5 w-2.5" />Expired</span>;
  if (state === 'expiring') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Clock className="h-2.5 w-2.5" />Expiring</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-2.5 w-2.5" />Compliant</span>;
}

function StatPill({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-4 py-3 min-w-0 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
      <div className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', accent ?? 'text-muted-foreground')}>
        <Icon className="h-3 w-3 shrink-0" />{label}
      </div>
      <p className="text-xl font-bold text-foreground tabular-nums leading-none mt-1 tracking-tight">{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
export default function Officers() {
  const { organization, profile } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = profile?.role === 'owner' || profile?.role === 'admin' || profile?.role === 'ops_manager';

  const [view, setView] = useState<DirectoryView>('roster');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Officer['employment_status']>('all');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'ok' | 'expiring' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newOfficer, setNewOfficer] = useState({ full_name: '', email: '', phone: '', badge_number: '', employment_status: 'active' as Officer['employment_status'], skills: '' });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Officer>>({});

  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [newCert, setNewCert] = useState({ name: '', number: '', expiry_date: '', type: 'guard_card' as Certification['type'] });

  /* ── queries ── */
  const { data: officers = [], isLoading } = useQuery({
    queryKey: ['officers', organization?.id],
    enabled: !!organization,
    queryFn: async () => { if (!organization) return []; const { data } = await db.officers.select(organization.id); return data || []; }
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ['officer-shifts', organization?.id],
    enabled: !!organization,
    queryFn: async () => { if (!organization) return []; const { data } = await db.getFullSchedule(organization.id); return data || []; }
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['officer-time', organization?.id],
    enabled: !!organization,
    queryFn: async () => { if (!organization) return []; const { data } = await db.getFullTimeEntries(organization.id); return data || []; }
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ['officer-incidents', organization?.id],
    enabled: !!organization,
    queryFn: async () => { if (!organization) return []; const { data } = await db.getFullIncidents(organization.id); return data || []; }
  });

  /* ── mutations ── */
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Officer> = { organization_id: organization?.id || '', full_name: newOfficer.full_name, email: newOfficer.email, phone: newOfficer.phone, badge_number: newOfficer.badge_number, employment_status: newOfficer.employment_status, skills: newOfficer.skills.split(',').map(s => s.trim()).filter(Boolean), certifications: [] };
      const { error } = await db.officers.create(payload as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['officers'] }); setIsAddOpen(false); setNewOfficer({ full_name: '', email: '', phone: '', badge_number: '', employment_status: 'active', skills: '' }); addToast({ type: 'success', title: 'Officer Added', description: 'New officer is now in your roster.' }); }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Officer> }) => { await db.officers.update(id, updates); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['officers'] }); setIsEditOpen(false); addToast({ type: 'success', title: 'Profile Updated' }); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => db.officers.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['officers'] }); setSelectedOfficerId(null); addToast({ type: 'info', title: 'Officer Removed' }); }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: Officer['employment_status']) => { await Promise.all(selectedIds.map(id => db.officers.update(id, { employment_status: status }))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['officers'] }); setSelectedIds([]); addToast({ type: 'success', title: 'Bulk Update Complete' }); }
  });

  /* ── analytics ── */
  const analyticsByOfficer = useMemo(() => {
    const map = new Map<string, { upcoming: number; hours30d: number; incidents: number; compliance: 'ok' | 'expiring' | 'expired' }>();
    const now = Date.now();
    const in30 = now - 30 * 24 * 60 * 60 * 1000;
    officers.forEach(officer => {
      const upcoming = shifts.filter((s: any) => s.officer_id === officer.id && new Date(s.start_time).getTime() >= now && s.status !== 'completed').length;
      const hours30d = timeEntries.filter((e: any) => e.officer_id === officer.id && new Date(e.clock_in).getTime() >= in30).reduce((sum: number, e: any) => sum + (e.total_hours || 0), 0);
      const incidentCount = incidents.filter((i: any) => i.officer_id === officer.id).length;
      let compliance: 'ok' | 'expiring' | 'expired' = 'ok';
      for (const cert of officer.certifications || []) {
        const expiry = new Date(cert.expiry_date).getTime();
        if (expiry < now) { compliance = 'expired'; break; }
        if (expiry < now + 30 * 24 * 60 * 60 * 1000) compliance = 'expiring';
      }
      map.set(officer.id, { upcoming, hours30d, incidents: incidentCount, compliance });
    });
    return map;
  }, [officers, shifts, timeEntries, incidents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return officers
      .filter(o => {
        if (statusFilter !== 'all' && o.employment_status !== statusFilter) return false;
        const a = analyticsByOfficer.get(o.id);
        if (complianceFilter !== 'all' && a?.compliance !== complianceFilter) return false;
        if (attentionOnly && !(a?.compliance === 'expired' || a?.compliance === 'expiring' || (a?.incidents || 0) > 0)) return false;
        if (!q) return true;
        return `${o.full_name} ${o.email} ${o.badge_number} ${(o.skills || []).join(' ')}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
        const as = analyticsByOfficer.get(a.id), bs = analyticsByOfficer.get(b.id);
        if (sortBy === 'upcoming') return (bs?.upcoming || 0) - (as?.upcoming || 0);
        if (sortBy === 'hours') return (bs?.hours30d || 0) - (as?.hours30d || 0);
        return (bs?.incidents || 0) - (as?.incidents || 0);
      });
  }, [officers, search, statusFilter, complianceFilter, attentionOnly, sortBy, analyticsByOfficer]);

  const rosterStats = useMemo(() => ({
    total: officers.length,
    active: officers.filter(o => o.employment_status === 'active').length,
    onboarding: officers.filter(o => o.employment_status === 'onboarding').length,
    expiring: officers.filter(o => analyticsByOfficer.get(o.id)?.compliance === 'expiring').length,
    expired: officers.filter(o => analyticsByOfficer.get(o.id)?.compliance === 'expired').length,
  }), [officers, analyticsByOfficer]);

  const weekStart = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); d.setHours(0, 0, 0, 0); return d; }, []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);

  const selectedOfficer = useMemo(() => officers.find(o => o.id === selectedOfficerId) || null, [officers, selectedOfficerId]);

  const openEdit = (officer: Officer) => {
    setEditData({ id: officer.id, full_name: officer.full_name, email: officer.email, phone: officer.phone, badge_number: officer.badge_number, employment_status: officer.employment_status, skills: officer.skills, financials: officer.financials, certifications: officer.certifications, notes: officer.notes });
    setIsEditOpen(true);
  };

  const addCertification = () => {
    if (!selectedOfficer || !newCert.name || !newCert.expiry_date) return;
    const cert: Certification = { id: Math.random().toString(36).slice(2, 9), name: newCert.name, number: newCert.number || 'N/A', type: newCert.type, status: 'active', issue_date: new Date().toISOString(), expiry_date: new Date(newCert.expiry_date).toISOString() };
    updateMutation.mutate({ id: selectedOfficer.id, updates: { certifications: [...(selectedOfficer.certifications || []), cert] } });
    setIsAddCertOpen(false);
    setNewCert({ name: '', number: '', expiry_date: '', type: 'guard_card' });
  };

  const removeCertification = (certId: string) => {
    if (!selectedOfficer) return;
    updateMutation.mutate({ id: selectedOfficer.id, updates: { certifications: (selectedOfficer.certifications || []).filter(c => c.id !== certId) } });
  };

  if (isLoading) return <div className="h-[calc(100vh-100px)] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  /* ── RENDER ── */
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">

      {/* ── HEADER BAND ── */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden relative z-10">
        <div className="p-5 lg:p-6 relative">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-foreground">Officer Roster</h1>
              </div>
              <p className="text-xs text-muted-foreground">Manage personnel, certifications, workload &amp; compliance.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['officers'] })} className="h-9 rounded-xl gap-2 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => setIsAddOpen(true)} className="h-9 rounded-xl px-4 gap-2 text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" /> Add Officer
                </Button>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
            <StatPill icon={Users} label="Total" value={rosterStats.total} />
            <StatPill icon={UserCheck} label="Active" value={rosterStats.active} accent="text-emerald-600 dark:text-emerald-400" />
            <StatPill icon={Zap} label="Onboarding" value={rosterStats.onboarding} accent="text-amber-600 dark:text-amber-400" />
            <StatPill icon={Clock} label="Expiring" value={rosterStats.expiring} accent="text-orange-600 dark:text-orange-400" />
            <StatPill icon={AlertTriangle} label="Expired" value={rosterStats.expired} accent="text-red-600 dark:text-red-400" />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search */}
            <div className="relative flex-1 lg:w-72 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, badge, skills…"
                className="w-full h-9 pl-10 pr-4 rounded-xl border border-border/50 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>}
            </div>

            {/* Filter toggle */}
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(v => !v)} className={cn('h-9 rounded-xl gap-1.5 shrink-0 transition-all duration-200 text-xs px-3', filtersOpen && 'border-primary/50 text-primary bg-primary/5')}>
              <Filter className="h-4 w-4" /> Filters
              {(statusFilter !== 'all' || complianceFilter !== 'all' || attentionOnly) && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>

            {/* Sort */}
            <div className="relative shrink-0">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="h-9 rounded-xl border border-border/50 bg-background px-3 pr-8 text-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 appearance-none min-w-[130px] transition-all duration-200 font-medium cursor-pointer">
                <option value="name">Sort: Name</option>
                <option value="upcoming">Sort: Upcoming</option>
                <option value="hours">Sort: 30d Hours</option>
                <option value="incidents">Sort: Incidents</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none rotate-90" />
            </div>

            {/* View */}
            <div className="flex items-center bg-muted/40 rounded-xl p-0.5 gap-0.5 shrink-0 border border-border/40 h-9">
              {(['roster', 'workload', 'table'] as DirectoryView[]).map(v => (
                <button key={v} onClick={() => setView(v)} className={cn('px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all duration-200 h-full', view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Expandable filters */}
          {filtersOpen && (
            <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
              {/* Status pills */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'active', 'onboarding', 'terminated'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize', statusFilter === s ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                    {s === 'all' ? 'All Status' : s}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-border/60 self-center hidden sm:block" />
              {/* Compliance pills */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'ok', 'expiring', 'expired'] as const).map(c => (
                  <button key={c} onClick={() => setComplianceFilter(c)} className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize', complianceFilter === c ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                    {c === 'all' ? 'All Compliance' : c === 'ok' ? 'Compliant' : c}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-border/60 self-center hidden sm:block" />
              <button onClick={() => setAttentionOnly(v => !v)} className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all', attentionOnly ? 'bg-amber-500 text-white border-transparent' : 'border-border text-muted-foreground hover:border-amber-400 hover:text-foreground')}>
                <AlertTriangle className="h-3 w-3" /> Needs Attention
              </button>
              <button onClick={() => { setStatusFilter('all'); setComplianceFilter('all'); setAttentionOnly(false); }} className="px-3 py-1 rounded-full text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all">
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BULK ACTION BAR ── */}
      {selectedIds.length > 0 && canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-primary/30 bg-primary/5 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-semibold text-primary">{selectedIds.length} officer{selectedIds.length > 1 ? 's' : ''} selected</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate('active')} disabled={bulkStatusMutation.isPending}>Set Active</Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate('onboarding')} disabled={bulkStatusMutation.isPending}>Set Onboarding</Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-600 border-red-200 hover:border-red-300" onClick={() => bulkStatusMutation.mutate('terminated')} disabled={bulkStatusMutation.isPending}>Terminate</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-border/40 bg-card flex flex-col">

        {/* ROSTER VIEW */}
        {view === 'roster' && (
          <div className="h-full overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No officers match this view" description="Adjust filters or onboard a new officer." action={canEdit ? { label: 'Add Officer', onClick: () => setIsAddOpen(true), icon: Plus } : undefined} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {filtered.map(officer => {
                  const analytics = analyticsByOfficer.get(officer.id);
                  const selected = selectedIds.includes(officer.id);
                  const sm = statusMeta(officer.employment_status);
                  return (
                    <div
                      key={officer.id}
                      onClick={() => setSelectedOfficerId(officer.id)}
                      className={cn(
                        'group relative rounded-2xl border text-left cursor-pointer transition-all duration-300 overflow-hidden bg-card hover:shadow-md',
                        selected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/40 hover:border-border/60'
                      )}
                    >
                      {/* Top accent strip */}
                      <div className={cn('h-1 w-full', sm.dot)} />

                      <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {canEdit && (
                              <input type="checkbox" checked={selected} onClick={e => e.stopPropagation()}
                                onChange={() => setSelectedIds(prev => prev.includes(officer.id) ? prev.filter(id => id !== officer.id) : [...prev, officer.id])}
                                className="h-3.5 w-3.5 rounded border-border accent-primary shrink-0"
                              />
                            )}
                            <div className="relative shrink-0">
                              <Avatar src={officer.image_url} fallback={officer.full_name[0]} className="h-10 w-10 ring-2 ring-background" />
                              <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background', sm.dot)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{officer.full_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{officer.email || '—'}</p>
                            </div>
                          </div>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', sm.badge)}>{sm.label}</span>
                        </div>

                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 gap-4 mb-4 pt-1">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Badge #</p>
                            <p className="text-sm font-semibold text-foreground tracking-tight">{officer.badge_number}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Phone</p>
                            <p className="text-sm font-semibold text-foreground tracking-tight">{officer.phone || '—'}</p>
                          </div>
                        </div>

                        {/* Status tags */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 bg-background/50', sm.badge)}>{sm.label}</span>
                          <CompliancePill state={analytics?.compliance || 'ok'} />
                        </div>

                        {/* Skills */}
                        {!!officer.skills?.length && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {officer.skills.slice(0, 3).map(skill => (
                              <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium border border-border/50">{skill}</span>
                            ))}
                            {officer.skills.length > 3 && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50">+{officer.skills.length - 3}</span>}
                          </div>
                        )}

                        {/* Hover arrow */}
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WORKLOAD VIEW */}
        {view === 'workload' && (
          <div className="h-full overflow-auto">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="grid sticky top-0 z-10 bg-muted/50 backdrop-blur-xl border-b border-border/50 shadow-sm" style={{ gridTemplateColumns: `200px repeat(${weekDays.length}, 1fr)` }}>
                <div className="p-3 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Officer</div>
                {weekDays.map(day => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={day.toISOString()} className={cn('p-3 text-center text-[10px] uppercase tracking-wider font-bold border-l border-border/40', isToday ? 'text-primary' : 'text-muted-foreground')}>
                      {day.toLocaleDateString(undefined, { weekday: 'short' })}<br />
                      <span className={cn('text-sm font-bold', isToday ? 'text-primary' : 'text-foreground')}>{day.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              {filtered.map(officer => {
                const officerShifts = shifts.filter((s: any) => s.officer_id === officer.id);
                const sm = statusMeta(officer.employment_status);
                return (
                  <div key={officer.id} className="grid border-b border-border/40 hover:bg-muted/10 transition-colors" style={{ gridTemplateColumns: `200px repeat(${weekDays.length}, 1fr)` }}>
                    <button className="p-3 text-left flex items-center gap-2.5 border-r border-border/40 hover:bg-muted/20 transition-colors" onClick={() => setSelectedOfficerId(officer.id)}>
                      <div className="relative shrink-0">
                        <Avatar src={officer.image_url} fallback={officer.full_name[0]} className="h-7 w-7" />
                        <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background', sm.dot)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{officer.full_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">#{officer.badge_number}</p>
                      </div>
                    </button>
                    {weekDays.map(day => {
                      const key = day.toISOString().slice(0, 10);
                      const rows = officerShifts.filter((s: any) => new Date(s.start_time).toISOString().slice(0, 10) === key);
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div key={`${officer.id}-${key}`} className={cn('p-1.5 border-l border-border/40 min-h-[72px]', isToday && 'bg-primary/[0.02]')}>
                          <div className="space-y-0.5">
                            {rows.slice(0, 2).map((shift: any) => (
                              <div key={shift.id} className={cn('rounded-lg px-1.5 py-1 text-[9px] leading-tight border', shift.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-primary/10 border-primary/20 text-primary')}>
                                <p className="font-bold tabular-nums">{new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="truncate opacity-80">{shift.site?.name || 'Site'}</p>
                              </div>
                            ))}
                            {rows.length > 2 && <p className="text-[9px] text-muted-foreground pl-1">+{rows.length - 2} more</p>}
                            {rows.length === 0 && <p className="text-[9px] text-muted-foreground/40 pl-1 pt-1">—</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TABLE VIEW */}
        {view === 'table' && (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-border/50 bg-muted/50 backdrop-blur-xl shadow-sm">
                <tr>
                  {canEdit && <th className="w-10 p-3" />}
                  <th className="p-3 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Officer</th>
                  <th className="p-3 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Contact</th>
                  <th className="p-3 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</th>
                  <th className="p-3 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Compliance</th>
                  <th className="p-3 text-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Upcoming</th>
                  <th className="p-3 text-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground">30d Hrs</th>
                  {canEdit && <th className="p-3 text-right text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map(officer => {
                  const a = analyticsByOfficer.get(officer.id);
                  const sm = statusMeta(officer.employment_status);
                  return (
                    <tr key={officer.id} className="hover:bg-muted/20 transition-colors group">
                      {canEdit && (
                        <td className="p-3">
                          <input type="checkbox" checked={selectedIds.includes(officer.id)} onChange={() => setSelectedIds(prev => prev.includes(officer.id) ? prev.filter(id => id !== officer.id) : [...prev, officer.id])} className="h-3.5 w-3.5 rounded accent-primary" />
                        </td>
                      )}
                      <td className="p-3">
                        <button onClick={() => setSelectedOfficerId(officer.id)} className="flex items-center gap-2.5 text-left hover:text-primary transition-colors">
                          <div className="relative shrink-0">
                            <Avatar src={officer.image_url} fallback={officer.full_name[0]} className="h-8 w-8" />
                            <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background', sm.dot)} />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{officer.full_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">#{officer.badge_number}</p>
                          </div>
                        </button>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          {officer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{officer.email}</span>}
                          {officer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{officer.phone}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border', sm.badge)}>{sm.label}</span>
                      </td>
                      <td className="p-3"><CompliancePill state={a?.compliance || 'ok'} /></td>
                      <td className="p-3 text-center font-bold tabular-nums text-sm">{a?.upcoming ?? 0}</td>
                      <td className="p-3 text-center font-bold tabular-nums text-sm">{(a?.hours30d ?? 0).toFixed(1)}</td>
                      {canEdit && (
                        <td className="p-3 text-right">
                          <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedOfficerId(officer.id)} title="View profile"><UserCog className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(officer)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 flex items-center justify-center">
                <EmptyState icon={Users} title="No officers found" description="Try adjusting your search or filters." />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ADD OFFICER DIALOG ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Onboard Officer</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <Input placeholder="Full name *" value={newOfficer.full_name} onChange={e => setNewOfficer(p => ({ ...p, full_name: e.target.value }))} />
            <Input placeholder="Email" value={newOfficer.email} onChange={e => setNewOfficer(p => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Phone" value={newOfficer.phone} onChange={e => setNewOfficer(p => ({ ...p, phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Badge number *" value={newOfficer.badge_number} onChange={e => setNewOfficer(p => ({ ...p, badge_number: e.target.value }))} />
              <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newOfficer.employment_status} onChange={e => setNewOfficer(p => ({ ...p, employment_status: e.target.value as Officer['employment_status'] }))}>
                {EMPLOYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <Input placeholder="Skills (comma-separated)" value={newOfficer.skills} onChange={e => setNewOfficer(p => ({ ...p, skills: e.target.value }))} />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
          <Button disabled={createMutation.isPending || !newOfficer.full_name || !newOfficer.badge_number} onClick={() => createMutation.mutate()}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add Officer
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── EDIT OFFICER DIALOG ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" /> Edit Officer</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <Input placeholder="Full name" value={editData.full_name as string || ''} onChange={e => setEditData(p => ({ ...p, full_name: e.target.value }))} />
            <Input placeholder="Email" value={editData.email as string || ''} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Phone" value={editData.phone as string || ''} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Badge number" value={editData.badge_number as string || ''} onChange={e => setEditData(p => ({ ...p, badge_number: e.target.value }))} />
              <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={(editData.employment_status as string) || 'active'} onChange={e => setEditData(p => ({ ...p, employment_status: e.target.value as Officer['employment_status'] }))}>
                {EMPLOYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
          <Button disabled={updateMutation.isPending || !editData.id} onClick={() => updateMutation.mutate({ id: editData.id as string, updates: editData })}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── ADD CERT DIALOG ── */}
      <Dialog open={isAddCertOpen} onOpenChange={setIsAddCertOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Add Certification</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <Input placeholder="Certification name *" value={newCert.name} onChange={e => setNewCert(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Certificate number" value={newCert.number} onChange={e => setNewCert(p => ({ ...p, number: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={newCert.expiry_date} onChange={e => setNewCert(p => ({ ...p, expiry_date: e.target.value }))} />
              <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newCert.type} onChange={e => setNewCert(p => ({ ...p, type: e.target.value as Certification['type'] }))}>
                <option value="guard_card">Guard Card</option>
                <option value="firearm">Firearm Permit</option>
                <option value="first_aid">First Aid</option>
                <option value="cpr">CPR</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddCertOpen(false)}>Cancel</Button>
          <Button onClick={addCertification} disabled={!newCert.name || !newCert.expiry_date}>Add Certification</Button>
        </DialogFooter>
      </Dialog>

      {/* ── OFFICER DETAIL SHEET ── */}
      <Sheet open={!!selectedOfficer} onOpenChange={open => !open && setSelectedOfficerId(null)}>
        {selectedOfficer && (() => {
          const a = analyticsByOfficer.get(selectedOfficer.id);
          const sm = statusMeta(selectedOfficer.employment_status);
          return (
            <>
              <SheetHeader>
                {/* Officer hero */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar src={selectedOfficer.image_url} fallback={selectedOfficer.full_name[0]} className="h-14 w-14 ring-2 ring-primary/20" />
                    <span className={cn('absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background', sm.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg">{selectedOfficer.full_name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border', sm.badge)}>{sm.label}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">#{selectedOfficer.badge_number}</span>
                      <CompliancePill state={a?.compliance || 'ok'} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <SheetContent className="space-y-5">
                {/* Quick status toggle */}
                {canEdit && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2.5">Quick Status</p>
                    <div className="flex gap-2">
                      {EMPLOYMENT_STATUSES.map(s => {
                        const active = selectedOfficer.employment_status === s.value;
                        return (
                          <Button key={s.value} size="sm" variant={active ? 'default' : 'outline'} className={cn('flex-1 text-xs', !active && 'text-muted-foreground')}
                            onClick={() => updateMutation.mutate({ id: selectedOfficer.id, updates: { employment_status: s.value } })}>
                            {s.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: TrendingUp, label: 'Upcoming', val: a?.upcoming ?? 0 },
                    { icon: Clock, label: '30d Hrs', val: (a?.hours30d ?? 0).toFixed(1) },
                    { icon: Shield, label: 'Incidents', val: a?.incidents ?? 0 },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-md p-4 text-center glass-card-depth hover-lift group transition-all duration-300">
                      <Icon className="h-5 w-5 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1 group-hover:text-foreground transition-colors">{label}</p>
                      <p className="text-2xl font-black text-foreground tabular-nums group-hover:text-primary transition-colors">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                <div className="rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-md divide-y divide-border/40 glass-card-depth overflow-hidden">
                  {[
                    { icon: Mail, val: selectedOfficer.email, label: 'Email' },
                    { icon: Phone, val: selectedOfficer.phone, label: 'Phone' },
                  ].map(({ icon: Icon, val, label }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">{val || <span className="italic text-muted-foreground">Not set</span>}</span>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="compliance">
                  <TabsList className="w-full">
                    <TabsTrigger value="compliance" className="flex-1"><Shield className="h-3.5 w-3.5 mr-1.5" />Compliance</TabsTrigger>
                    <TabsTrigger value="finance" className="flex-1"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Finance</TabsTrigger>
                    <TabsTrigger value="work" className="flex-1"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Work</TabsTrigger>
                  </TabsList>

                  <TabsContent value="compliance" className="space-y-3">
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-semibold">Certifications</p>
                      {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setIsAddCertOpen(true)}><Plus className="h-3 w-3" />Add</Button>}
                    </div>
                    <div className="space-y-2">
                      {(selectedOfficer.certifications || []).map(cert => {
                        const state = complianceState(cert.expiry_date);
                        return (
                          <div key={cert.id} className={cn('rounded-xl border p-3 flex justify-between gap-2', state === 'expired' ? 'border-red-500/20 bg-red-500/5' : state === 'expiring' ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/60 bg-card/50')}>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{cert.name}</p>
                              <p className="text-[11px] text-muted-foreground">#{cert.number} · Expires {new Date(cert.expiry_date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <CompliancePill state={state} />
                              {canEdit && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeCertification(cert.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>}
                            </div>
                          </div>
                        );
                      })}
                      {!(selectedOfficer.certifications?.length) && <p className="text-xs text-muted-foreground py-2">No certifications on file.</p>}
                    </div>
                  </TabsContent>

                  <TabsContent value="finance" className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-md p-4 glass-card-depth group hover-lift transition-all duration-300">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold group-hover:text-foreground transition-colors">Base Rate</p>
                        <p className="text-3xl font-black mt-1 group-hover:text-primary transition-colors">${selectedOfficer.financials?.base_rate ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">per hour</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-md p-4 glass-card-depth group hover-lift transition-all duration-300">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold group-hover:text-foreground transition-colors">OT Rate</p>
                        <p className="text-3xl font-black mt-1 group-hover:text-primary transition-colors">${selectedOfficer.financials?.overtime_rate ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">per hour</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground px-2">Use Edit Officer to modify financial profile and deductions.</p>
                  </TabsContent>

                  <TabsContent value="work" className="space-y-2 mt-1">
                    {[
                      { label: 'Upcoming Shifts', val: a?.upcoming ?? 0 },
                      { label: 'Hours (30d)', val: `${(a?.hours30d ?? 0).toFixed(1)} hrs` },
                      { label: 'Incidents Total', val: a?.incidents ?? 0 },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 px-3 py-2.5">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold tabular-nums">{val}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </SheetContent>

              <SheetFooter>
                <div className="flex w-full items-center justify-between gap-2">
                  {canEdit && (
                    <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}
                      onClick={() => { if (confirm(`Delete ${selectedOfficer.full_name}?`)) deleteMutation.mutate(selectedOfficer.id); }}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                  <div className="ml-auto flex gap-2">
                    {canEdit && <Button variant="outline" size="sm" onClick={() => openEdit(selectedOfficer)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
                    <Button size="sm" onClick={() => setSelectedOfficerId(null)}>Close</Button>
                  </div>
                </div>
              </SheetFooter>
            </>
          );
        })()}
      </Sheet>
    </div>
  );
}
