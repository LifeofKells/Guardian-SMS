import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/db';
import type { Client, Officer, Shift, Site } from '../lib/types';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  GripVertical,
  Layers,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Shuffle,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';

type View = 'studio' | 'timeline' | 'agenda' | 'calendar';

interface EnrichedShift extends Shift {
  site?: Site & { client?: Client };
  officer?: Officer | null;
}

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const dateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const statusTone = (shift: EnrichedShift) => {
  if (shift.status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10';
  if (!shift.officer_id) return 'border-amber-500/40 bg-amber-500/10';
  return 'border-blue-500/40 bg-blue-500/10';
};

export default function Schedule() {
  const { profile, organization } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';

  const [view, setView] = useState<View>('studio');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'resource'>('month');
  const [resourceAxis, setResourceAxis] = useState<'officer' | 'site'>('officer');
  const [showWeekend, setShowWeekend] = useState(true);
  const [dayLensDate, setDayLensDate] = useState<Date | null>(null);
  const [dayLensPinned, setDayLensPinned] = useState(true);
  const [dayLensWidth, setDayLensWidth] = useState(460);
  const [isResizingDayLens, setIsResizingDayLens] = useState(false);
  const dayLensResizeRef = useRef(isResizingDayLens);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [officerFilter, setOfficerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'assigned' | 'completed'>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragOfficer, setDragOfficer] = useState<Officer | null>(null);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createData, setCreateData] = useState({
    template: 'custom' as 'custom' | 'day' | 'night' | 'swing',
    site_id: '',
    officer_id: '',
    date: dateKey(new Date()),
    start_time: '08:00',
    end_time: '16:00',
    repeat: 'none' as 'none' | 'daily' | 'weekly',
    repeat_count: 1,
    break_duration: 30,
    pay_rate: '',
    bill_rate: '',
    status: 'published' as Shift['status']
  });
  const [editData, setEditData] = useState({
    id: '',
    site_id: '',
    officer_id: '',
    date: '',
    start_time: '',
    end_time: '',
    break_duration: 0,
    pay_rate: '',
    bill_rate: '',
    status: 'published' as Shift['status']
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['schedule', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data, error } = await db.getFullSchedule(organization.id);
      if (error) throw error;
      return (data as EnrichedShift[]) || [];
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

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.clients.select(organization.id);
      return data || [];
    }
  });

  const assignMutation = useMutation({
    mutationFn: async ({ shiftId, officerId }: { shiftId: string; officerId: string | null }) => {
      const { error } = await db.shifts.update(shiftId, { officer_id: officerId, status: officerId ? 'assigned' : 'published' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule'] })
  });

  const createMutation = useMutation({
    mutationFn: async (rows: Partial<Shift>[]) => {
      await Promise.all(rows.map((row) => db.shifts.create(row as any)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setIsCreateOpen(false);
      addToast({ type: 'success', title: 'Shifts Scheduled', description: 'New shifts added to the board.' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Shift> }) => {
      const { error } = await db.shifts.update(id, updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setIsEditOpen(false);
      addToast({ type: 'success', title: 'Shift Updated', description: 'Changes saved.' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.shifts.delete(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setIsEditOpen(false);
      addToast({ type: 'info', title: 'Shift Deleted', description: 'Removed from schedule.' });
    }
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ type, officerId }: { type: 'assign' | 'unassign' | 'publish' | 'delete'; officerId?: string }) => {
      if (type === 'delete') {
        await Promise.all(selectedIds.map((id) => db.shifts.delete(id)));
        return;
      }
      if (type === 'assign') {
        await Promise.all(selectedIds.map((id) => db.shifts.update(id, { officer_id: officerId || null, status: officerId ? 'assigned' : 'published' })));
        return;
      }
      if (type === 'unassign') {
        await Promise.all(selectedIds.map((id) => db.shifts.update(id, { officer_id: null, status: 'published' })));
        return;
      }
      await Promise.all(selectedIds.map((id) => db.shifts.update(id, { status: 'published' })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setSelectedIds([]);
      setSelectionMode(false);
      addToast({ type: 'success', title: 'Bulk Action Complete', description: 'Selected shifts were updated.' });
    }
  });

  const dayActionMutation = useMutation({
    mutationFn: async (action: 'publish' | 'autoassign' | 'copy-next-week') => {
      if (!dayLensDate) return;

      if (action === 'publish') {
        const targets = dayLensAllRows.filter((shift) => shift.status !== 'completed').map((shift) => shift.id);
        await Promise.all(targets.map((id) => db.shifts.update(id, { status: 'published' })));
        return;
      }

      if (action === 'autoassign') {
        const openRows = dayLensAllRows.filter((shift) => !shift.officer_id && shift.status !== 'completed');
        for (const shift of openRows) {
          const candidate = recommendOfficer(shift, officers, shifts);
          if (candidate) {
            await db.shifts.update(shift.id, { officer_id: candidate.id, status: 'assigned' });
          }
        }
        return;
      }

      const clones: Partial<Shift>[] = dayLensAllRows.map((shift) => {
        const start = addDays(new Date(shift.start_time), 7);
        const end = addDays(new Date(shift.end_time), 7);
        return {
          organization_id: shift.organization_id,
          site_id: shift.site_id,
          officer_id: shift.officer_id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: shift.officer_id ? 'assigned' : 'published',
          break_duration: shift.break_duration || 0,
          pay_rate: shift.pay_rate ?? null,
          bill_rate: shift.bill_rate ?? null
        };
      });
      await Promise.all(clones.map((row) => db.shifts.create(row as any)));
    },
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      const messages: Record<string, string> = {
        publish: 'Day shifts published.',
        autoassign: 'Open shifts auto-assigned where possible.',
        'copy-next-week': 'Day shifts copied to next week.'
      };
      addToast({ type: 'success', title: 'Day Action Complete', description: messages[action] });
    }
  });

  const weekStart = getStartOfWeek(weekAnchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const globallyFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shifts.filter((shift) => {
      if (siteFilter !== 'all' && shift.site_id !== siteFilter) return false;
      if (officerFilter !== 'all' && (shift.officer_id || '') !== officerFilter) return false;
      if (statusFilter === 'open' && !!shift.officer_id) return false;
      if (statusFilter === 'assigned' && (!shift.officer_id || shift.status === 'completed')) return false;
      if (statusFilter === 'completed' && shift.status !== 'completed') return false;
      if (!q) return true;
      const hay = `${shift.site?.name || ''} ${shift.site?.client?.name || ''} ${shift.officer?.full_name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [shifts, search, siteFilter, officerFilter, statusFilter]);

  const filtered = useMemo(
    () => globallyFiltered.filter((shift) => {
      const start = new Date(shift.start_time);
      return start >= weekStart && start < weekEnd;
    }),
    [globallyFiltered, weekStart, weekEnd]
  );

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, EnrichedShift[]>();
    globallyFiltered.forEach((shift) => {
      const key = dateKey(new Date(shift.start_time));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(shift);
    });
    map.forEach((rows) => rows.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    return map;
  }, [globallyFiltered]);

  const calendarWeekDays = useMemo(() => {
    const start = getStartOfWeek(calendarAnchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return showWeekend ? days : days.filter((d) => ![0, 6].includes(d.getDay()));
  }, [calendarAnchor, showWeekend]);

  const calendarWeekStart = useMemo(() => getStartOfWeek(calendarAnchor), [calendarAnchor]);
  const calendarWeekEnd = useMemo(() => addDays(calendarWeekStart, 7), [calendarWeekStart]);

  const resourceRows = useMemo(() => {
    const weekRows = globallyFiltered.filter((shift) => {
      const start = new Date(shift.start_time);
      if (start < calendarWeekStart || start >= calendarWeekEnd) return false;
      if (!showWeekend && [0, 6].includes(start.getDay())) return false;
      return true;
    });

    const makeCellMap = (rows: EnrichedShift[]) => {
      const byDay = new Map<string, EnrichedShift[]>();
      rows.forEach((shift) => {
        const key = dateKey(new Date(shift.start_time));
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(shift);
      });
      return byDay;
    };

    if (resourceAxis === 'officer') {
      const activeOfficers = officers.filter((officer) => officer.employment_status === 'active');
      const mapped = activeOfficers.map((officer) => {
        const rows = weekRows.filter((shift) => shift.officer_id === officer.id);
        return {
          id: officer.id,
          label: officer.full_name,
          sublabel: officer.badge_number,
          cells: makeCellMap(rows),
          total: rows.length
        };
      }).filter((row) => row.total > 0);

      const unassigned = weekRows.filter((shift) => !shift.officer_id);
      if (unassigned.length > 0) {
        mapped.push({
          id: 'unassigned',
          label: 'Unassigned',
          sublabel: 'Open coverage',
          cells: makeCellMap(unassigned),
          total: unassigned.length
        });
      }

      return mapped.sort((a, b) => b.total - a.total);
    }

    const mappedSites = sites.map((site) => {
      const rows = weekRows.filter((shift) => shift.site_id === site.id);
      return {
        id: site.id,
        label: site.name,
        sublabel: site.address,
        cells: makeCellMap(rows),
        total: rows.length
      };
    }).filter((row) => row.total > 0);

    return mappedSites.sort((a, b) => b.total - a.total);
  }, [globallyFiltered, calendarWeekStart, calendarWeekEnd, showWeekend, resourceAxis, officers, sites]);

  const byDay = useMemo(
    () => weekDays.map((day) => {
      const key = dateKey(day);
      const rows = filtered
        .filter((shift) => dateKey(new Date(shift.start_time)) === key)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      return { day, rows };
    }),
    [filtered, weekDays]
  );

  const calendarMatrix = useMemo(() => {
    const year = calendarAnchor.getFullYear();
    const month = calendarAnchor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = first.getDay();

    const cells: Array<Date | null> = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    // Always show 6 weeks (42 cells) to ensure consistent layout and completeness
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [calendarAnchor]);

  const dayLensRows = useMemo(() => {
    if (!dayLensDate) return [] as EnrichedShift[];
    const key = dateKey(dayLensDate);
    return shiftsByDate.get(key) || [];
  }, [dayLensDate, shiftsByDate]);

  const dayLensAllRows = useMemo(() => {
    if (!dayLensDate) return [] as EnrichedShift[];
    const key = dateKey(dayLensDate);
    return shifts
      .filter((shift) => dateKey(new Date(shift.start_time)) === key)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [dayLensDate, shifts]);

  const dayLensGrouped = useMemo(() => {
    const map = new Map<string, EnrichedShift[]>();
    dayLensRows.forEach((shift) => {
      const key = shift.site?.name || 'Unspecified Site';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(shift);
    });
    return Array.from(map.entries());
  }, [dayLensRows]);

  const dayLensStats = useMemo(() => {
    const open = dayLensAllRows.filter((shift) => !shift.officer_id).length;
    const assigned = dayLensAllRows.filter((shift) => !!shift.officer_id && shift.status !== 'completed').length;
    const completed = dayLensAllRows.filter((shift) => shift.status === 'completed').length;
    return { total: dayLensAllRows.length, open, assigned, completed };
  }, [dayLensAllRows]);

  const stats = useMemo(() => {
    const open = filtered.filter((shift) => !shift.officer_id).length;
    const assigned = filtered.filter((shift) => !!shift.officer_id && shift.status !== 'completed').length;
    const completed = filtered.filter((shift) => shift.status === 'completed').length;
    const conflicts = filtered.reduce((sum, shift) => sum + (hasConflict(shift, filtered) ? 1 : 0), 0);
    return { open, assigned, completed, conflicts };
  }, [filtered]);

  const creationPreview = useMemo(() => {
    const payload = buildCreateRows(createData, organization?.id || '', shifts);
    return payload;
  }, [createData, organization?.id, shifts]);

  const resetFilters = () => {
    setSearch('');
    setSiteFilter('all');
    setOfficerFilter('all');
    setStatusFilter('all');
  };

  const handleDragStart = (officer: Officer, e: React.DragEvent) => {
    setDragOfficer(officer);
    e.dataTransfer.setData('officerId', officer.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (shiftId: string, e: React.DragEvent) => {
    e.preventDefault();
    const officerId = e.dataTransfer.getData('officerId');
    if (!officerId) return;
    assignMutation.mutate({ shiftId, officerId });
    setDragOfficer(null);
  };

  const openEdit = (shift: EnrichedShift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    setEditData({
      id: shift.id,
      site_id: shift.site_id,
      officer_id: shift.officer_id || '',
      date: dateKey(start),
      start_time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      end_time: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      break_duration: shift.break_duration || 0,
      pay_rate: shift.pay_rate?.toString() || '',
      bill_rate: shift.bill_rate?.toString() || '',
      status: shift.status
    });
    setIsEditOpen(true);
  };

  const applyTemplate = (template: 'custom' | 'day' | 'night' | 'swing') => {
    setCreateData((prev) => {
      if (template === 'day') return { ...prev, template, start_time: '08:00', end_time: '16:00', break_duration: 30, repeat: 'none' };
      if (template === 'night') return { ...prev, template, start_time: '20:00', end_time: '04:00', break_duration: 30, repeat: 'none' };
      if (template === 'swing') return { ...prev, template, start_time: '14:00', end_time: '22:00', break_duration: 30, repeat: 'daily', repeat_count: 5 };
      return { ...prev, template };
    });
  };

  const quickAutoAssign = (shift: EnrichedShift) => {
    const suggestion = recommendOfficer(shift, officers, shifts);
    if (!suggestion) {
      addToast({ type: 'warning', title: 'No Suggestion', description: 'No available officer without conflict.' });
      return;
    }
    assignMutation.mutate({ shiftId: shift.id, officerId: suggestion.id });
  };

  useEffect(() => {
    dayLensResizeRef.current = isResizingDayLens;
  }, [isResizingDayLens]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dayLensResizeRef.current) return;
      const next = Math.min(760, Math.max(360, window.innerWidth - e.clientX));
      setDayLensWidth(next);
    };
    const onMouseUp = () => {
      if (!dayLensResizeRef.current) return;
      setIsResizingDayLens(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (isLoading) {
    return <div className="h-[calc(100vh-100px)] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      <Card className="border-border/70 bg-gradient-to-r from-background to-muted/20">
        <CardContent className="p-4 lg:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shift Studio</h1>
              <p className="text-xs text-muted-foreground mt-1">A redesigned scheduling workspace optimized for dispatch speed and staffing clarity.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['schedule'] })}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
              {canEdit && <Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Shift Plan</Button>}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatMini title="Open" value={stats.open} tone="amber" />
            <StatMini title="Assigned" value={stats.assigned} tone="blue" />
            <StatMini title="Completed" value={stats.completed} tone="emerald" />
            <StatMini title="Conflict Flags" value={stats.conflicts} tone="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.8fr_auto] gap-2">
            <Input placeholder="Search site, client, officer" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
              <option value="all">All Sites</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={officerFilter} onChange={(e) => setOfficerFilter(e.target.value)}>
              <option value="all">All Officers</option>
              {officers.filter((officer) => officer.employment_status === 'active').map((officer) => <option key={officer.id} value={officer.id}>{officer.full_name}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="completed">Completed</option>
            </select>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold min-w-[220px] text-center">
                {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <Button variant="outline" size="icon" onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button variant={selectionMode ? 'secondary' : 'outline'} size="sm" onClick={() => { setSelectionMode((prev) => !prev); setSelectedIds([]); }}>
                  <Layers className="h-4 w-4 mr-1" /> {selectionMode ? 'Exit Bulk' : 'Bulk Select'}
                </Button>
              )}
              <Tabs defaultValue={view} value={view} onValueChange={(value) => setView(value as View)}>
                <TabsList>
                  <TabsTrigger value="studio"><Sparkles className="h-3.5 w-3.5 mr-1" /> Studio</TabsTrigger>
                  <TabsTrigger value="timeline"><CalendarDays className="h-3.5 w-3.5 mr-1" /> Timeline</TabsTrigger>
                  <TabsTrigger value="calendar"><Calendar className="h-3.5 w-3.5 mr-1" /> Calendar</TabsTrigger>
                  <TabsTrigger value="agenda"><List className="h-3.5 w-3.5 mr-1" /> Agenda</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectionMode && selectedIds.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <p className="text-sm font-semibold text-primary">{selectedIds.length} shifts selected</p>
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(filtered.map((shift) => shift.id))}>Select Filtered ({filtered.length})</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
              <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ type: 'publish' })}>Publish</Button>
              <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ type: 'unassign' })}>Unassign</Button>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete ${selectedIds.length} shifts?`)) bulkMutation.mutate({ type: 'delete' }); }}>Delete</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={cn(
        "flex-1 grid grid-cols-1 gap-4 overflow-hidden transition-all duration-300 ease-in-out",
        isLeftOpen && isRightOpen ? "xl:grid-cols-[280px_1fr_320px]" :
          isLeftOpen && !isRightOpen ? "xl:grid-cols-[280px_1fr_48px]" :
            !isLeftOpen && isRightOpen ? "xl:grid-cols-[48px_1fr_320px]" :
              "xl:grid-cols-[48px_1fr_48px]"
      )}>
        {isLeftOpen ? (
          <Card className="hidden xl:flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 pr-2">
              <CardTitle className="text-sm">Active Officers</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsLeftOpen(false)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 overflow-y-auto custom-scrollbar">
              {officers.filter((officer) => officer.employment_status === 'active').map((officer) => (
                <div
                  key={officer.id}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(officer, e)}
                  className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2 cursor-grab hover:bg-muted/40"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <Avatar className="h-7 w-7" fallback={officer.full_name[0]} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{officer.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{officer.badge_number}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="hidden xl:flex flex-col items-center py-3 bg-muted/10 border-dashed hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setIsLeftOpen(true)}>
            <Button variant="ghost" size="icon" className="h-8 w-8 mb-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <span className="block transform -rotate-90 whitespace-nowrap text-[10px] font-bold tracking-widest text-muted-foreground/70 uppercase">
                Officers
              </span>
            </div>
          </Card>
        )}

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 border-none shadow-none bg-transparent">
          <CardContent className="p-0 h-full">
            <Tabs defaultValue={view} value={view} onValueChange={(value) => setView(value as View)} className="h-full">
              <TabsContent value="studio" className="h-full m-0 p-3 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3 min-w-0">
                  {byDay.map(({ day, rows }) => (
                    <div key={dateKey(day)} className="rounded-xl border border-border bg-muted/20 min-h-[240px] flex flex-col">
                      <div className="px-3 py-2 border-b border-border bg-background/70 sticky top-0 z-10 backdrop-blur-sm">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">{day.getDate()}</p>
                          <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
                        </div>
                      </div>
                      <div className="p-2 space-y-2 flex-1">
                        {rows.map((shift) => (
                          <button
                            key={shift.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(shift.id, e)}
                            onClick={() => {
                              if (!canEdit) return;
                              if (selectionMode) {
                                setSelectedIds((prev) => prev.includes(shift.id) ? prev.filter((id) => id !== shift.id) : [...prev, shift.id]);
                              } else {
                                openEdit(shift);
                              }
                            }}
                            className={cn(
                              'w-full rounded-lg border p-2 text-left transition-colors hover:bg-background',
                              statusTone(shift),
                              selectedIds.includes(shift.id) && 'ring-2 ring-primary border-primary'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold truncate">{shift.site?.name || 'Site'}</p>
                              {hasConflict(shift, shifts) && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{timeLabel(shift.start_time)} - {timeLabel(shift.end_time)}</p>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] truncate">{shift.officer?.full_name || 'Unassigned'}</span>
                              {!shift.officer_id && canEdit && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    quickAutoAssign(shift);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10"
                                >
                                  <Shuffle className="h-3 w-3" /> Auto
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No shifts</p>}
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="w-full border border-dashed" onClick={() => {
                            setCreateData((prev) => ({ ...prev, date: dateKey(day) }));
                            setIsCreateOpen(true);
                          }}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="h-full m-0 p-3 overflow-auto">
                <div className="space-y-3">
                  {byDay.map(({ day, rows }) => (
                    <div key={dateKey(day)} className="rounded-xl border border-border bg-background overflow-hidden">
                      <div className="px-3 py-2 border-b border-border bg-muted/20 flex justify-between items-center">
                        <p className="text-sm font-semibold">{day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        <Badge variant="outline">{rows.length} shifts</Badge>
                      </div>
                      <div className="p-3 relative">
                        <div className="relative h-24">
                          {Array.from({ length: 7 }).map((_, i) => {
                            const hour = i * 4;
                            return <div key={hour} className="absolute top-0 bottom-0 border-l border-border/60" style={{ left: `${(hour / 24) * 100}%` }} />;
                          })}
                          {rows.map((shift) => {
                            const start = new Date(shift.start_time);
                            const end = new Date(shift.end_time);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const endMinRaw = end.getHours() * 60 + end.getMinutes();
                            const endMin = end <= start ? endMinRaw + 1440 : endMinRaw;
                            const left = (startMin / 1440) * 100;
                            const width = Math.max(((endMin - startMin) / 1440) * 100, 4);
                            return (
                              <button
                                key={shift.id}
                                onClick={() => openEdit(shift)}
                                className={cn('absolute top-3 h-10 rounded-md border px-2 text-left text-xs shadow-sm', statusTone(shift))}
                                style={{ left: `${left}%`, width: `${width}%` }}
                              >
                                <span className="truncate block font-medium">{shift.site?.name || 'Shift'}</span>
                                <span className="truncate block text-[10px] text-muted-foreground">{shift.officer?.full_name || 'Unassigned'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="calendar" className="h-full m-0 p-3 overflow-y-auto premium-scrollbar">
                <Card className="h-full flex flex-col border-border/80 shadow-sm">
                  <CardHeader className="pb-3 border-b border-border shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">Calendar Lens</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <div className="flex items-center rounded-md border border-border p-0.5">
                          <Button size="sm" variant={calendarMode === 'month' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setCalendarMode('month')}>Month</Button>
                          <Button size="sm" variant={calendarMode === 'week' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setCalendarMode('week')}>Week</Button>
                          <Button size="sm" variant={calendarMode === 'resource' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setCalendarMode('resource')}>Resource</Button>
                        </div>
                        {calendarMode === 'resource' && (
                          <div className="flex items-center rounded-md border border-border p-0.5">
                            <Button size="sm" variant={resourceAxis === 'officer' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setResourceAxis('officer')}>By Officer</Button>
                            <Button size="sm" variant={resourceAxis === 'site' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setResourceAxis('site')}>By Site</Button>
                          </div>
                        )}
                        <label className="text-xs text-muted-foreground inline-flex items-center gap-1 mr-1">
                          <input type="checkbox" checked={showWeekend} onChange={(e) => setShowWeekend(e.target.checked)} /> Weekend
                        </label>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCalendarAnchor(new Date())}>Today</Button>
                        <Button variant="outline" size="icon" onClick={() => setCalendarAnchor(new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() - 1, 1))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-3 py-1.5 rounded-md border border-border text-sm font-semibold min-w-[180px] text-center">
                          {calendarAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setCalendarAnchor(new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() + 1, 1))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Click any day to keep details open in the side drawer while scanning other dates.</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Open</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Assigned</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    {calendarMode === 'month' ? (
                      <>
                        <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-[10px] uppercase tracking-wider text-muted-foreground text-center font-semibold">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {calendarMatrix.map((date, idx) => {
                            if (!date) return <div key={`blank-${idx}`} className="h-28 rounded-lg bg-muted/20 border border-border/40" />;
                            const key = dateKey(date);
                            const rows = shiftsByDate.get(key) || [];
                            const open = rows.filter((shift) => !shift.officer_id).length;
                            const assigned = rows.filter((shift) => !!shift.officer_id && shift.status !== 'completed').length;
                            const completed = rows.filter((shift) => shift.status === 'completed').length;
                            const intensity = rows.length >= 8 ? 'bg-blue-600/15 border-blue-500/40' : rows.length >= 4 ? 'bg-blue-500/10 border-blue-400/40' : rows.length > 0 ? 'bg-muted/30 border-border' : 'bg-background border-border';
                            const isToday = dateKey(new Date()) === key;

                            return (
                              <button
                                key={key}
                                onClick={() => setDayLensDate(date)}
                                className={cn('h-28 rounded-lg border p-2 text-left transition-colors hover:bg-accent/50 overflow-hidden', intensity, isToday && 'ring-2 ring-primary/60')}
                              >
                                <div className="flex items-start justify-between w-full">
                                  <span className="text-sm font-bold">{date.getDate()}</span>
                                  {rows.length > 0 && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{rows.length}</Badge>}
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                                  <span className="text-amber-600 font-semibold">{open}</span>
                                  <span className="text-blue-600 font-semibold text-center">{assigned}</span>
                                  <span className="text-emerald-600 font-semibold text-right">{completed}</span>
                                </div>
                                <div className="mt-2 space-y-1">
                                  {rows.slice(0, 2).map((shift) => (
                                    <p key={shift.id} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-background/70 border border-border/60">
                                      {timeLabel(shift.start_time)} {shift.site?.name || 'Site'}
                                    </p>
                                  ))}
                                  {rows.length > 2 && <p className="text-[10px] text-muted-foreground">+{rows.length - 2} more</p>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : calendarMode === 'week' ? (
                      <div className={cn('grid gap-2', showWeekend ? 'grid-cols-7' : 'grid-cols-5')}>
                        {calendarWeekDays.map((date) => {
                          const key = dateKey(date);
                          const rows = shiftsByDate.get(key) || [];
                          const isToday = dateKey(new Date()) === key;
                          return (
                            <button key={key} onClick={() => setDayLensDate(date)} className={cn('rounded-lg border border-border p-3 text-left min-h-[220px] hover:bg-muted/30 transition-colors', isToday && 'ring-2 ring-primary/60')}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                                  <p className="text-sm font-bold">{date.getDate()}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
                              </div>
                              <div className="space-y-1.5">
                                {rows.slice(0, 5).map((shift) => (
                                  <div key={shift.id} className={cn('rounded-md border px-2 py-1 text-[10px] text-left', statusTone(shift))}>
                                    <p className="font-semibold truncate">{timeLabel(shift.start_time)} {shift.site?.name || 'Site'}</p>
                                    <p className="truncate text-muted-foreground">{shift.officer?.full_name || 'Unassigned'}</p>
                                  </div>
                                ))}
                                {rows.length > 5 && <p className="text-[10px] text-muted-foreground">+{rows.length - 5} more shifts</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border overflow-auto">
                        <div className="min-w-[980px]">
                          <div
                            className="grid border-b border-border bg-muted/30"
                            style={{ gridTemplateColumns: `220px repeat(${calendarWeekDays.length}, minmax(120px, 1fr))` }}
                          >
                            <div className="p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              {resourceAxis === 'officer' ? 'Officer' : 'Site'}
                            </div>
                            {calendarWeekDays.map((day) => (
                              <div key={`head-${dateKey(day)}`} className="p-3 text-center border-l border-border text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                              </div>
                            ))}
                          </div>

                          {resourceRows.map((row) => (
                            <div
                              key={row.id}
                              className="grid border-b border-border/70"
                              style={{ gridTemplateColumns: `220px repeat(${calendarWeekDays.length}, minmax(120px, 1fr))` }}
                            >
                              <div className="p-3 border-r border-border bg-background/70">
                                <p className="text-sm font-semibold truncate">{row.label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{row.sublabel || 'No details'}</p>
                                <Badge variant="outline" className="mt-1 text-[10px]">{row.total} shifts</Badge>
                              </div>

                              {calendarWeekDays.map((day) => {
                                const key = dateKey(day);
                                const rows = row.cells.get(key) || [];
                                return (
                                  <button
                                    key={`${row.id}-${key}`}
                                    onClick={() => setDayLensDate(day)}
                                    className="min-h-[92px] p-2 text-left border-l border-border hover:bg-muted/20 transition-colors"
                                  >
                                    <div className="space-y-1">
                                      {rows.slice(0, 2).map((shift) => (
                                        <div key={shift.id} className={cn('rounded border px-1.5 py-1 text-[10px]', statusTone(shift))}>
                                          <p className="font-semibold truncate">{timeLabel(shift.start_time)}</p>
                                          <p className="truncate text-muted-foreground">{resourceAxis === 'officer' ? (shift.site?.name || 'Site') : (shift.officer?.full_name || 'Unassigned')}</p>
                                        </div>
                                      ))}
                                      {rows.length > 2 && <p className="text-[10px] text-muted-foreground">+{rows.length - 2} more</p>}
                                      {rows.length === 0 && <p className="text-[10px] text-muted-foreground/70">No shifts</p>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ))}

                          {resourceRows.length === 0 && (
                            <div className="p-10">
                              <EmptyState
                                icon={CalendarDays}
                                title="No resource schedule data"
                                description="Try broadening filters or switching resource axis."
                                variant="compact"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="agenda" className="h-full m-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40 z-10 border-b border-border">
                    <tr>
                      {selectionMode && <th className="p-3 text-left text-xs uppercase text-muted-foreground">Pick</th>}
                      <th className="p-3 text-left text-xs uppercase text-muted-foreground">Date</th>
                      <th className="p-3 text-left text-xs uppercase text-muted-foreground">Time</th>
                      <th className="p-3 text-left text-xs uppercase text-muted-foreground">Site</th>
                      <th className="p-3 text-left text-xs uppercase text-muted-foreground">Officer</th>
                      <th className="p-3 text-right text-xs uppercase text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered
                      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                      .map((shift) => (
                        <tr key={shift.id} className={cn('hover:bg-muted/30', selectedIds.includes(shift.id) && 'bg-primary/5')}>
                          {selectionMode && (
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(shift.id)}
                                onChange={() => setSelectedIds((prev) => prev.includes(shift.id) ? prev.filter((id) => id !== shift.id) : [...prev, shift.id])}
                              />
                            </td>
                          )}
                          <td className="p-3">{new Date(shift.start_time).toLocaleDateString()}</td>
                          <td className="p-3">{timeLabel(shift.start_time)} - {timeLabel(shift.end_time)}</td>
                          <td className="p-3">
                            <p className="font-medium">{shift.site?.name || '-'}</p>
                            {shift.site?.client && <p className="text-[10px] text-muted-foreground">{shift.site.client.name}</p>}
                          </td>
                          <td className="p-3">{shift.officer?.full_name || 'Unassigned'}</td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(shift)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {isRightOpen ? (
          <Card className="hidden xl:flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 pr-2">
              <CardTitle className="text-sm">Smart Insights</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsRightOpen(false)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 overflow-y-auto custom-scrollbar">
              {filtered.filter((shift) => !shift.officer_id).slice(0, 8).map((shift) => (
                <div key={shift.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <p className="text-xs font-semibold">Open: {shift.site?.name || 'Site'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(shift.start_time).toLocaleString()}</p>
                  <Button size="sm" variant="ghost" className="h-7 mt-1 px-2 text-xs" onClick={() => quickAutoAssign(shift)}>
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Auto Assign
                  </Button>
                </div>
              ))}

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Quick Utilities</p>
                <div className="mt-2 space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setCreateData((prev) => ({ ...prev, repeat: 'weekly', repeat_count: 4 }))}><Copy className="h-3.5 w-3.5 mr-1" /> 4-Week Plan</Button>
                  <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setWeekAnchor(new Date())}><CalendarDays className="h-3.5 w-3.5 mr-1" /> Jump to Current Week</Button>
                  <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setSelectionMode(true)}><Users className="h-3.5 w-3.5 mr-1" /> Start Bulk Selection</Button>
                </div>
              </div>

              {filtered.length === 0 && (
                <EmptyState
                  icon={CalendarDays}
                  title="No shifts in this view"
                  description="Adjust filters or create a new shift plan."
                  action={{ label: 'New Shift Plan', onClick: () => setIsCreateOpen(true), icon: Plus }}
                  variant="compact"
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="hidden xl:flex flex-col items-center py-3 bg-muted/10 border-dashed hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setIsRightOpen(true)}>
            <Button variant="ghost" size="icon" className="h-8 w-8 mb-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <span className="block transform rotate-90 whitespace-nowrap text-[10px] font-bold tracking-widest text-muted-foreground/70 uppercase">
                Insights
              </span>
            </div>
          </Card>
        )}
      </div>

      {dayLensDate && (
        <>
          {!dayLensPinned && (
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" onClick={() => setDayLensDate(null)} />
          )}

          <div
            className="fixed inset-y-0 right-0 z-50 border-l border-border bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col"
            style={{ width: `${dayLensWidth}px` }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/30 transition-colors"
              onMouseDown={() => setIsResizingDayLens(true)}
              title="Drag to resize"
            />

            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Day Drawer</p>
                <h3 className="text-sm font-bold">{dayLensDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={dayLensPinned ? 'secondary' : 'outline'} onClick={() => setDayLensPinned((v) => !v)}>{dayLensPinned ? 'Pinned' : 'Pin'}</Button>
                <Button size="icon" variant="ghost" onClick={() => setDayLensDate(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border border-border p-2"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-base font-bold">{dayLensStats.total}</p></div>
                <div className="rounded-lg border border-border p-2"><p className="text-[10px] text-muted-foreground">Open</p><p className="text-base font-bold text-amber-600">{dayLensStats.open}</p></div>
                <div className="rounded-lg border border-border p-2"><p className="text-[10px] text-muted-foreground">Assigned</p><p className="text-base font-bold text-blue-600">{dayLensStats.assigned}</p></div>
                <div className="rounded-lg border border-border p-2"><p className="text-[10px] text-muted-foreground">Done</p><p className="text-base font-bold text-emerald-600">{dayLensStats.completed}</p></div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="relative h-16">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const hour = i * 4;
                    return <div key={hour} className="absolute top-0 bottom-0 border-l border-border/50" style={{ left: `${(hour / 24) * 100}%` }} />;
                  })}
                  {dayLensRows.map((shift, idx) => {
                    const start = new Date(shift.start_time);
                    const end = new Date(shift.end_time);
                    const startMin = start.getHours() * 60 + start.getMinutes();
                    const endRaw = end.getHours() * 60 + end.getMinutes();
                    const endMin = end <= start ? endRaw + 1440 : endRaw;
                    const left = (startMin / 1440) * 100;
                    const width = Math.max(((endMin - startMin) / 1440) * 100, 5);
                    return (
                      <div key={shift.id} className={cn('absolute h-4 rounded border', statusTone(shift))} style={{ left: `${left}%`, width: `${width}%`, top: `${(idx % 3) * 18 + 6}px` }} />
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => dayActionMutation.mutate('autoassign')} disabled={dayActionMutation.isPending}><UserCheck className="h-3.5 w-3.5 mr-1" /> Auto Assign Open</Button>
                <Button size="sm" variant="outline" onClick={() => dayActionMutation.mutate('publish')} disabled={dayActionMutation.isPending}>Publish Day</Button>
                <Button size="sm" variant="outline" onClick={() => dayActionMutation.mutate('copy-next-week')} disabled={dayActionMutation.isPending}><Copy className="h-3.5 w-3.5 mr-1" /> Copy +7d</Button>
              </div>

              <div className="space-y-3">
                {dayLensGrouped.map(([site, rows]) => (
                  <div key={site} className="rounded-lg border border-border bg-muted/20">
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                      <p className="text-xs font-semibold truncate">{site}</p>
                      <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
                    </div>
                    <div className="p-2 space-y-2">
                      {rows.map((shift) => (
                        <button key={shift.id} onClick={() => openEdit(shift)} className={cn('w-full rounded-md border p-2 text-left transition-colors hover:bg-background', statusTone(shift))}>
                          <p className="text-xs font-semibold">{timeLabel(shift.start_time)} - {timeLabel(shift.end_time)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{shift.officer?.full_name || 'Unassigned'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {dayLensRows.length === 0 && (
                  <EmptyState
                    icon={CalendarDays}
                    title="No shifts on this day"
                    description="Use quick create to add a shift for this date."
                    action={canEdit && dayLensDate ? {
                      label: 'Create Shift For Day',
                      onClick: () => {
                        setCreateData((prev) => ({ ...prev, date: dateKey(dayLensDate) }));
                        setDayLensDate(null);
                        setIsCreateOpen(true);
                      },
                      icon: Plus
                    } : undefined}
                    variant="compact"
                  />
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20">
              <div className="flex w-full justify-between gap-2">
                <Button variant="outline" onClick={() => setDayLensDate(dayLensDate ? addDays(dayLensDate, -1) : null)}><ChevronLeft className="h-4 w-4 mr-1" /> Prev Day</Button>
                <Button variant="outline" onClick={() => setDayLensDate(dayLensDate ? addDays(dayLensDate, 1) : null)}>Next Day <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Create Shift Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Template</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={createData.template} onChange={(e) => applyTemplate(e.target.value as any)}>
                  <option value="custom">Custom</option>
                  <option value="day">Day Patrol (08:00-16:00)</option>
                  <option value="night">Night Watch (20:00-04:00)</option>
                  <option value="swing">Swing Shift (14:00-22:00 x5)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Create As</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={createData.status} onChange={(e) => setCreateData((prev) => ({ ...prev, status: e.target.value as Shift['status'] }))}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="assigned">Assigned</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Site</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={createData.site_id} onChange={(e) => setCreateData((prev) => ({ ...prev, site_id: e.target.value }))}>
                  <option value="">Select site...</option>
                  {sites.map((site) => {
                    const client = clients.find((c) => c.id === site.client_id);
                    return <option key={site.id} value={site.id}>{client ? `${client.name} - ` : ''}{site.name}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Officer (optional)</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={createData.officer_id} onChange={(e) => {
                  const officer = officers.find((o) => o.id === e.target.value);
                  setCreateData((prev) => ({
                    ...prev,
                    officer_id: e.target.value,
                    pay_rate: officer?.financials?.base_rate?.toString() || prev.pay_rate
                  }));
                }}>
                  <option value="">Open shift</option>
                  {officers.filter((officer) => officer.employment_status === 'active').map((officer) => <option key={officer.id} value={officer.id}>{officer.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input type="date" value={createData.date} onChange={(e) => setCreateData((prev) => ({ ...prev, date: e.target.value }))} />
              <Input type="time" value={createData.start_time} onChange={(e) => setCreateData((prev) => ({ ...prev, start_time: e.target.value }))} />
              <Input type="time" value={createData.end_time} onChange={(e) => setCreateData((prev) => ({ ...prev, end_time: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1"><Label>Repeat</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={createData.repeat} onChange={(e) => setCreateData((prev) => ({ ...prev, repeat: e.target.value as any }))}><option value="none">No Repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div>
              <div className="space-y-1"><Label>Count</Label><Input type="number" min={1} max={30} value={createData.repeat_count} onChange={(e) => setCreateData((prev) => ({ ...prev, repeat_count: Number(e.target.value) || 1 }))} /></div>
              <div className="space-y-1"><Label>Pay $/h</Label><Input type="number" value={createData.pay_rate} onChange={(e) => setCreateData((prev) => ({ ...prev, pay_rate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Bill $/h</Label><Input type="number" value={createData.bill_rate} onChange={(e) => setCreateData((prev) => ({ ...prev, bill_rate: e.target.value }))} /></div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan Preview</p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div><p className="text-[10px] text-muted-foreground">Generated shifts</p><p className="text-lg font-bold">{creationPreview.count}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Planned hours</p><p className="text-lg font-bold">{creationPreview.hours.toFixed(1)}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Conflict flags</p><p className={cn('text-lg font-bold', creationPreview.conflicts > 0 ? 'text-destructive' : 'text-emerald-600')}>{creationPreview.conflicts}</p></div>
              </div>
              {creationPreview.error && <p className="text-xs text-destructive mt-2">{creationPreview.error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !!creationPreview.error || creationPreview.count === 0}
              onClick={() => createMutation.mutate(creationPreview.rows)}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create {creationPreview.count > 0 ? `${creationPreview.count} Shift${creationPreview.count > 1 ? 's' : ''}` : 'Shifts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Shift</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1">
              <Label>Site</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editData.site_id} onChange={(e) => setEditData((prev) => ({ ...prev, site_id: e.target.value }))}>
                <option value="">Select site...</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Officer</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editData.officer_id} onChange={(e) => setEditData((prev) => ({ ...prev, officer_id: e.target.value }))}>
                <option value="">Open shift</option>
                {officers.filter((officer) => officer.employment_status === 'active').map((officer) => <option key={officer.id} value={officer.id}>{officer.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="date" value={editData.date} onChange={(e) => setEditData((prev) => ({ ...prev, date: e.target.value }))} />
              <Input type="time" value={editData.start_time} onChange={(e) => setEditData((prev) => ({ ...prev, start_time: e.target.value }))} />
              <Input type="time" value={editData.end_time} onChange={(e) => setEditData((prev) => ({ ...prev, end_time: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Pay rate" value={editData.pay_rate} onChange={(e) => setEditData((prev) => ({ ...prev, pay_rate: e.target.value }))} />
              <Input type="number" placeholder="Bill rate" value={editData.bill_rate} onChange={(e) => setEditData((prev) => ({ ...prev, bill_rate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Break minutes" value={editData.break_duration} onChange={(e) => setEditData((prev) => ({ ...prev, break_duration: Number(e.target.value) || 0 }))} />
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={editData.status} onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value as Shift['status'] }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full justify-between gap-2">
              <Button variant="destructive" onClick={() => deleteMutation.mutate(editData.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const start = new Date(`${editData.date}T${editData.start_time}`);
                    const end = new Date(`${editData.date}T${editData.end_time}`);
                    if (end <= start) end.setDate(end.getDate() + 1);
                    updateMutation.mutate({
                      id: editData.id,
                      updates: {
                        site_id: editData.site_id,
                        officer_id: editData.officer_id || null,
                        start_time: start.toISOString(),
                        end_time: end.toISOString(),
                        break_duration: editData.break_duration,
                        pay_rate: editData.pay_rate ? Number(editData.pay_rate) : null,
                        bill_rate: editData.bill_rate ? Number(editData.bill_rate) : null,
                        status: editData.status
                      }
                    });
                  }}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function hasConflict(shift: EnrichedShift, all: EnrichedShift[]) {
  if (!shift.officer_id || shift.status === 'completed') return false;
  const start = new Date(shift.start_time).getTime();
  const end = new Date(shift.end_time).getTime();
  return all.some((other) => {
    if (other.id === shift.id || other.officer_id !== shift.officer_id || other.status === 'completed') return false;
    const otherStart = new Date(other.start_time).getTime();
    const otherEnd = new Date(other.end_time).getTime();
    return start < otherEnd && end > otherStart;
  });
}

function recommendOfficer(target: EnrichedShift, officers: Officer[], shifts: EnrichedShift[]) {
  const active = officers.filter((officer) => officer.employment_status === 'active');
  const start = new Date(target.start_time).getTime();
  const end = new Date(target.end_time).getTime();
  return active.find((officer) => {
    return !shifts.some((shift) => {
      if (shift.officer_id !== officer.id || shift.status === 'completed' || shift.id === target.id) return false;
      const s = new Date(shift.start_time).getTime();
      const e = new Date(shift.end_time).getTime();
      return start < e && end > s;
    });
  });
}

function buildCreateRows(form: {
  site_id: string;
  officer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  repeat: 'none' | 'daily' | 'weekly';
  repeat_count: number;
  break_duration: number;
  pay_rate: string;
  bill_rate: string;
  status: Shift['status'];
}, orgId: string, allShifts: EnrichedShift[]) {
  if (!form.site_id || !form.date || !form.start_time || !form.end_time || !orgId) {
    return { rows: [] as Partial<Shift>[], count: 0, hours: 0, conflicts: 0, error: 'Fill required fields before creating.' };
  }

  const rows: Partial<Shift>[] = [];
  const baseDate = new Date(`${form.date}T00:00:00`);
  const count = Math.max(1, Number(form.repeat_count) || 1);

  for (let i = 0; i < (form.repeat === 'none' ? 1 : count); i++) {
    const date = new Date(baseDate);
    if (form.repeat === 'daily') date.setDate(date.getDate() + i);
    if (form.repeat === 'weekly') date.setDate(date.getDate() + i * 7);
    const dateIso = date.toISOString().slice(0, 10);

    const start = new Date(`${dateIso}T${form.start_time}`);
    const end = new Date(`${dateIso}T${form.end_time}`);
    if (end <= start) end.setDate(end.getDate() + 1);

    rows.push({
      organization_id: orgId,
      site_id: form.site_id,
      officer_id: form.officer_id || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      break_duration: Number(form.break_duration) || 0,
      pay_rate: form.pay_rate ? Number(form.pay_rate) : null,
      bill_rate: form.bill_rate ? Number(form.bill_rate) : null,
      status: form.status === 'assigned' && !form.officer_id ? 'published' : form.status
    });
  }

  const hours = rows.reduce((sum, row) => {
    const start = new Date(row.start_time as string).getTime();
    const end = new Date(row.end_time as string).getTime();
    const breakHours = Number(row.break_duration || 0) / 60;
    return sum + Math.max(0, ((end - start) / (1000 * 60 * 60)) - breakHours);
  }, 0);

  let conflicts = 0;
  if (form.officer_id) {
    rows.forEach((row) => {
      const s = new Date(row.start_time as string).getTime();
      const e = new Date(row.end_time as string).getTime();
      const overlap = allShifts.some((shift) => {
        if (shift.officer_id !== form.officer_id || shift.status === 'completed') return false;
        const ss = new Date(shift.start_time).getTime();
        const ee = new Date(shift.end_time).getTime();
        return s < ee && e > ss;
      });
      if (overlap) conflicts += 1;
    });
  }

  return { rows, count: rows.length, hours, conflicts, error: null as string | null };
}

function StatMini({ title, value, tone }: { title: string; value: number; tone: 'amber' | 'blue' | 'emerald' | 'rose' }) {
  const color = tone === 'amber' ? 'text-amber-600' : tone === 'blue' ? 'text-blue-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-rose-600';
  return (
    <div className="rounded-lg border border-border bg-background/80 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className={cn('text-xl font-bold mt-1', color)}>{value}</p>
    </div>
  );
}
