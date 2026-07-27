import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';
import type { TimeEntry } from '../lib/types';
import { useToast } from '../contexts/ToastContext';
import { DARPreview } from '../components/DARPreview';
import { EmptyState } from '../components/EmptyState';
import {
  CalendarDays,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';

type BoardTab = 'pipeline' | 'ledger' | 'review';

export default function Timesheets() {
  const { profile, organization } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';

  const [tab, setTab] = useState<BoardTab>('pipeline');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDAROpen, setIsDAROpen] = useState(false);
  const [darData, setDarData] = useState<any>(null);
  const [loadingDAR, setLoadingDAR] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState({
    officer_id: '',
    site_id: '',
    clock_in: '',
    clock_out: '',
    break_duration: 0,
    status: 'approved' as TimeEntry['status']
  });

  const [editEntry, setEditEntry] = useState<any>(null);
  const [editData, setEditData] = useState({
    clock_in: '',
    clock_out: '',
    status: 'pending' as TimeEntry['status']
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timeEntries', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.getFullTimeEntries(organization.id);
      let rows = data || [];
      if (!isAdmin && profile?.id) rows = rows.filter((entry) => entry.officer_id === profile.id);
      return rows;
    }
  });

  const { data: officers = [] } = useQuery({
    queryKey: ['officers', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.officers.select(organization.id);
      return data || [];
    }
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.sites.select(organization.id);
      return data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TimeEntry> }) => {
      await db.time_entries.update(id, updates);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setIsEditOpen(false);
      db.audit_logs.create({
        action: 'update',
        description: `Updated time entry ${vars.id}`,
        performed_by: profile?.full_name || 'System',
        performed_by_id: profile?.id || 'system',
        target_resource: 'TimeEntry',
        target_id: vars.id,
        organization_id: organization?.id || '',
        timestamp: new Date().toISOString()
      });
      addToast({ type: 'success', title: 'Entry Updated', description: 'Timesheet entry changes saved.' });
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { officer_id, site_id, clock_in, clock_out, break_duration, status } = newEntry;
      const { data: shift } = await db.shifts.create({
        organization_id: organization?.id || '',
        site_id,
        officer_id,
        start_time: clock_in,
        end_time: clock_out,
        status: 'completed',
        break_duration
      } as any);

      if (!shift) throw new Error('Could not create shift shell');

      const start = new Date(clock_in);
      const end = new Date(clock_out);
      const totalHours = Math.max(0, ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) - (break_duration / 60));

      await db.time_entries.create({
        organization_id: organization?.id || '',
        shift_id: shift.id,
        officer_id,
        clock_in,
        clock_out,
        total_hours: totalHours,
        status,
        billing_status: 'unbilled',
        payroll_status: 'ready'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setIsAddOpen(false);
      setNewEntry({ officer_id: '', site_id: '', clock_in: '', clock_out: '', break_duration: 0, status: 'approved' });
      addToast({ type: 'success', title: 'Manual Entry Added', description: 'New timesheet entry has been created.' });
    }
  });

  const bulkMutation = useMutation({
    mutationFn: async (status: TimeEntry['status']) => {
      await Promise.all(selectedIds.map((id) => db.time_entries.update(id, { status })));
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setSelectedIds([]);
      addToast({ type: 'success', title: 'Bulk Update Complete', description: `Selected entries set to ${status}.` });
    }
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((entry: any) => {
        if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
        if (siteFilter !== 'all' && entry.shift?.site_id !== siteFilter) return false;
        if (dateFilter) {
          const d = new Date(entry.clock_in).toISOString().slice(0, 10);
          if (d !== dateFilter) return false;
        }
        if (!q) return true;
        const hay = `${entry.officer?.full_name || ''} ${entry.officer?.badge_number || ''} ${entry.shift?.site?.name || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a: any, b: any) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
  }, [entries, search, statusFilter, siteFilter, dateFilter]);

  const stats = useMemo(() => {
    const hours = filtered.reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0);
    const pending = filtered.filter((entry: any) => entry.status === 'pending').length;
    const approved = filtered.filter((entry: any) => entry.status === 'approved').length;
    const rejected = filtered.filter((entry: any) => entry.status === 'rejected').length;
    return { total: filtered.length, hours, pending, approved, rejected };
  }, [filtered]);

  const lanes = useMemo(() => ({
    pending: filtered.filter((entry: any) => entry.status === 'pending'),
    approved: filtered.filter((entry: any) => entry.status === 'approved'),
    rejected: filtered.filter((entry: any) => entry.status === 'rejected')
  }), [filtered]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSiteFilter('all');
    setDateFilter('');
  };

  const exportCsv = () => {
    const csv = [
      ['officer', 'site', 'clock_in', 'clock_out', 'hours', 'status'],
      ...filtered.map((entry: any) => [
        entry.officer?.full_name || '',
        entry.shift?.site?.name || '',
        new Date(entry.clock_in).toISOString(),
        entry.clock_out ? new Date(entry.clock_out).toISOString() : '',
        Number(entry.total_hours || 0).toFixed(2),
        entry.status
      ])
    ].map((row) => row.map((value) => `"${String(value).replace(/\"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timesheet-studio-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openEdit = (entry: any) => {
    setEditEntry(entry);
    setEditData({
      clock_in: new Date(entry.clock_in).toISOString().slice(0, 16),
      clock_out: entry.clock_out ? new Date(entry.clock_out).toISOString().slice(0, 16) : '',
      status: entry.status
    });
    setIsEditOpen(true);
  };

  const submitEdit = () => {
    if (!editEntry) return;
    const start = new Date(editData.clock_in);
    const end = editData.clock_out ? new Date(editData.clock_out) : new Date();
    const breakMins = editEntry.shift?.break_duration || 0;
    const totalHours = Math.max(0, ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) - (breakMins / 60));
    updateMutation.mutate({
      id: editEntry.id,
      updates: {
        clock_in: start.toISOString(),
        clock_out: editData.clock_out ? end.toISOString() : undefined,
        status: editData.status,
        total_hours: totalHours
      }
    });
  };

  const handleDAR = async (shiftId: string) => {
    setLoadingDAR(shiftId);
    try {
      const { data } = await db.getDARData(shiftId);
      setDarData(data);
      setIsDAROpen(true);
    } finally {
      setLoadingDAR(null);
    }
  };

  if (isLoading) {
    return <div className="h-[calc(100vh-100px)] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
      
      {/* ── Architectural Header ── */}
      <div className="flex flex-col gap-5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Timesheet Studio</h1>
            <p className="text-sm text-muted-foreground mt-1">A redesigned approval cockpit for attendance, payroll readiness, and DAR verification.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4 border-border/60 bg-transparent hover:bg-muted/20" onClick={() => queryClient.invalidateQueries({ queryKey: ['timeEntries'] })}><RefreshCw className="h-4 w-4 mr-2" /> Sync</Button>
            {isAdmin && <Button variant="outline" size="sm" className="h-9 px-4 border-border/60 bg-transparent hover:bg-muted/20" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export</Button>}
            {isAdmin && <Button size="sm" className="h-9 px-4 shadow-sm" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MiniStat title="Visible" value={stats.total} tone="slate" />
          <MiniStat title="Hours" value={Number(stats.hours.toFixed(1))} tone="blue" />
          <MiniStat title="Pending" value={stats.pending} tone="amber" />
          <MiniStat title="Approved" value={stats.approved} tone="emerald" />
          <MiniStat title="Rejected" value={stats.rejected} tone="rose" />
        </div>

        <div className="flex flex-col lg:flex-row gap-3 border-b border-border/40 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] flex-1 gap-3 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-[0.6rem] h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search officer, badge, site..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-card/40 border-border/50 text-sm shadow-none focus-visible:ring-1" />
            </div>
            <select className="h-9 rounded-md border border-border/50 bg-card/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none custom-select-arrow" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="h-9 rounded-md border border-border/50 bg-card/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none custom-select-arrow" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
              <option value="all">All Sites</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-9 bg-card/40 border-border/50 text-sm shadow-none focus-visible:ring-1" />
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground h-9 px-3">Reset</Button>
        </div>
      </div>

      <Tabs defaultValue={tab} value={tab} onValueChange={(value) => setTab(value as BoardTab)} className="flex-1 flex flex-col gap-4 min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="pipeline"><Sparkles className="h-3.5 w-3.5 mr-1" /> Pipeline</TabsTrigger>
          <TabsTrigger value="ledger"><CalendarDays className="h-3.5 w-3.5 mr-1" /> Ledger</TabsTrigger>
          <TabsTrigger value="review"><UserCheck className="h-3.5 w-3.5 mr-1" /> Review Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="m-0 min-h-0 flex-1">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatusLane
              title="Pending"
              tone="amber"
              entries={lanes.pending}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onEdit={openEdit}
              onDAR={handleDAR}
              loadingDAR={loadingDAR}
              canSelect={isAdmin}
            />
            <StatusLane
              title="Approved"
              tone="emerald"
              entries={lanes.approved}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onEdit={openEdit}
              onDAR={handleDAR}
              loadingDAR={loadingDAR}
              canSelect={isAdmin}
            />
            <StatusLane
              title="Rejected"
              tone="rose"
              entries={lanes.rejected}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onEdit={openEdit}
              onDAR={handleDAR}
              loadingDAR={loadingDAR}
              canSelect={isAdmin}
            />
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="m-0 min-h-0 flex-1">
          <Card className="h-full overflow-hidden">
            <CardContent className="p-0 h-full overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/40 border-b border-border z-10">
                  <tr>
                    {isAdmin && <th className="p-3 text-left text-xs uppercase text-muted-foreground">Pick</th>}
                    <th className="p-3 text-left text-xs uppercase text-muted-foreground">Officer</th>
                    <th className="p-3 text-left text-xs uppercase text-muted-foreground">Site</th>
                    <th className="p-3 text-left text-xs uppercase text-muted-foreground">Clock Window</th>
                    <th className="p-3 text-left text-xs uppercase text-muted-foreground">Hours</th>
                    <th className="p-3 text-left text-xs uppercase text-muted-foreground">Status</th>
                    <th className="p-3 text-right text-xs uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((entry: any) => (
                    <tr key={entry.id} className={cn('hover:bg-muted/20', selectedIds.includes(entry.id) && 'bg-primary/5')}>
                      {isAdmin && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onChange={() => setSelectedIds((prev) => prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id])}
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7" fallback={entry.officer?.full_name?.[0]} />
                          <div>
                            <p className="font-medium text-sm">{entry.officer?.full_name || '-'}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.officer?.badge_number || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{entry.shift?.site?.name || '-'}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(entry.clock_in).toLocaleString()}<br />
                        {entry.clock_out ? new Date(entry.clock_out).toLocaleString() : 'Active'}
                      </td>
                      <td className="p-3 font-semibold">{Number(entry.total_hours || 0).toFixed(2)}</td>
                      <td className="p-3"><StatusBadge status={entry.status} /></td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          {entry.shift_id && (
                            <Button size="sm" variant="ghost" onClick={() => handleDAR(entry.shift_id)}>
                              {loadingDAR === entry.shift_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}><Eye className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-10">
                  <EmptyState
                    icon={Clock}
                    title="No timesheet entries"
                    description="Try changing filters or add a manual entry."
                    action={isAdmin ? { label: 'Add Entry', onClick: () => setIsAddOpen(true), icon: Plus } : undefined}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="m-0 min-h-0 flex-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Approval Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-auto max-h-[calc(100vh-340px)]">
              {isAdmin && selectedIds.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-primary">{selectedIds.length} selected</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate('approved')} disabled={bulkMutation.isPending}><Check className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate('rejected')} disabled={bulkMutation.isPending}><X className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
                  </div>
                </div>
              )}

              {lanes.pending.map((entry: any) => (
                <div key={entry.id} className="rounded-xl border border-border bg-card p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => setSelectedIds((prev) => prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id])}
                        className="mt-1"
                      />
                    )}
                    <Avatar className="h-8 w-8" fallback={entry.officer?.full_name?.[0]} />
                    <div>
                      <p className="text-sm font-semibold">{entry.officer?.full_name || 'Officer'}</p>
                      <p className="text-xs text-muted-foreground">{entry.shift?.site?.name || 'Site'} - {new Date(entry.clock_in).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{Number(entry.total_hours || 0).toFixed(2)} hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: entry.id, updates: { status: 'approved' } })}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: entry.id, updates: { status: 'rejected' } })}><X className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>Edit</Button>
                  </div>
                </div>
              ))}

              {lanes.pending.length === 0 && (
                <EmptyState
                  icon={UserCheck}
                  title="Queue is clear"
                  description="No pending entries waiting for review."
                  variant="default"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Manual Entry</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newEntry.officer_id} onChange={(e) => setNewEntry((prev) => ({ ...prev, officer_id: e.target.value }))}>
              <option value="">Select officer...</option>
              {officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.full_name}</option>)}
            </select>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newEntry.site_id} onChange={(e) => setNewEntry((prev) => ({ ...prev, site_id: e.target.value }))}>
              <option value="">Select site...</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="datetime-local" value={newEntry.clock_in} onChange={(e) => setNewEntry((prev) => ({ ...prev, clock_in: e.target.value }))} />
              <Input type="datetime-local" value={newEntry.clock_out} onChange={(e) => setNewEntry((prev) => ({ ...prev, clock_out: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={newEntry.break_duration} onChange={(e) => setNewEntry((prev) => ({ ...prev, break_duration: Number(e.target.value) || 0 }))} placeholder="Break minutes" />
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={newEntry.status} onChange={(e) => setNewEntry((prev) => ({ ...prev, status: e.target.value as TimeEntry['status'] }))}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending || !newEntry.officer_id || !newEntry.site_id || !newEntry.clock_in || !newEntry.clock_out} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Entry</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="datetime-local" value={editData.clock_in} onChange={(e) => setEditData((prev) => ({ ...prev, clock_in: e.target.value }))} />
              <Input type="datetime-local" value={editData.clock_out} onChange={(e) => setEditData((prev) => ({ ...prev, clock_out: e.target.value }))} />
            </div>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editData.status} onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value as TimeEntry['status'] }))}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DARPreview open={isDAROpen} onOpenChange={setIsDAROpen} data={darData} />
    </div>
  );
}

function StatusBadge({ status }: { status: TimeEntry['status'] }) {
  if (status === 'approved') return <Badge variant="success">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function MiniStat({ title, value, tone }: { title: string; value: number; tone: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' }) {
  const color = tone === 'blue' ? 'text-blue-400' : tone === 'amber' ? 'text-amber-500' : tone === 'emerald' ? 'text-emerald-500' : tone === 'rose' ? 'text-rose-500' : 'text-foreground';
  const borderTone = tone === 'blue' ? 'border-l-blue-400/50' : tone === 'amber' ? 'border-l-amber-500/50' : tone === 'emerald' ? 'border-l-emerald-500/50' : tone === 'rose' ? 'border-l-rose-500/50' : 'border-l-border/50';
  return (
    <div className={cn("p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-md shadow-sm border-l-4", borderTone)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className={cn('text-3xl font-bold mt-1 tracking-tight', color)}>{value}</p>
    </div>
  );
}

function StatusLane({
  title,
  tone,
  entries,
  selectedIds,
  setSelectedIds,
  onEdit,
  onDAR,
  loadingDAR,
  canSelect
}: {
  title: string;
  tone: 'amber' | 'emerald' | 'rose';
  entries: any[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onEdit: (entry: any) => void;
  onDAR: (shiftId: string) => void;
  loadingDAR: string | null;
  canSelect: boolean;
}) {
  const toneClass = tone === 'amber'
    ? 'border-amber-500/30 bg-amber-500/10'
    : tone === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-rose-500/30 bg-rose-500/10';

  return (
    <Card className="overflow-hidden min-h-0 flex flex-col">
      <CardHeader className={cn('border-b', toneClass)}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-2 overflow-y-auto custom-scrollbar min-h-[260px]">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                {canSelect && (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedIds.includes(entry.id)}
                    onChange={() => setSelectedIds((prev) => prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id])}
                  />
                )}
                <Avatar className="h-7 w-7" fallback={entry.officer?.full_name?.[0]} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{entry.officer?.full_name || 'Officer'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{entry.shift?.site?.name || 'Site'}</p>
                </div>
              </div>
              <StatusBadge status={entry.status} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(entry.clock_in).toLocaleString()}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Number(entry.total_hours || 0).toFixed(2)}h</span>
              <div className="flex gap-1">
                {entry.shift_id && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onDAR(entry.shift_id)}>
                    {loadingDAR === entry.shift_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onEdit(entry)}>Edit</Button>
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-muted-foreground">No entries in this lane</div>
        )}
      </CardContent>
    </Card>
  );
}
