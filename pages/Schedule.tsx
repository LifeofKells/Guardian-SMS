
import React, { useState } from 'react';
import { Card, CardContent, Badge, Button, Avatar, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label, Input, Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui';
import { db } from '../lib/db';
import { Officer, Shift, Site, Client } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { Plus, ChevronLeft, ChevronRight, GripVertical, AlertCircle, X, CheckCircle2, Loader2, Repeat, DollarSign, Pencil, Trash2, CalendarDays, Calendar as CalendarIcon, List as ListIcon, Columns, MapPin, Coffee, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';

type ViewType = 'day' | 'week' | 'month' | 'list';

interface EnrichedShift extends Shift {
  site?: Site & { client?: Client };
  officer?: Officer | null;
}

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const addDays = (d: Date, days: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
};

export default function Schedule() {
  const { profile, organization } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [draggedOfficer, setDraggedOfficer] = useState<Officer | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // --- QUERIES ---
  const { data: shifts = [] } = useQuery({
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

  // --- MUTATIONS ---
  const assignMutation = useMutation({
    mutationFn: async ({ shiftId, officerId }: { shiftId: string, officerId: string | null }) => {
      const { error } = await db.shifts.update(shiftId, {
        officer_id: officerId,
        status: officerId ? 'assigned' : 'published'
      });
      if (error) throw error;
      return { shiftId, officerId };
    },
    onMutate: async ({ shiftId, officerId }) => {
      await queryClient.cancelQueries({ queryKey: ['schedule'] });
      const previousSchedule = queryClient.getQueryData(['schedule']);
      const officer = officers.find(o => o.id === officerId);

      queryClient.setQueryData(['schedule'], (old: any[]) => {
        return old.map(s => {
          if (s.id === shiftId) {
            return {
              ...s,
              officer_id: officerId,
              officer: officer || null,
              status: officerId ? 'assigned' : 'published'
            };
          }
          return s;
        });
      });

      return { previousSchedule, officer };
    },
    onSuccess: (data, variables, context) => {
      const offName = context.officer?.full_name || 'Unassigned';
      addToast({ type: 'success', title: "Shift Assigned", description: `${offName} assigned successfully.` });

      db.audit_logs.create({
        action: 'update',
        organization_id: organization?.id || '',
        description: variables.officerId ? `Assigned officer ${offName} to shift.` : 'Unassigned officer from shift.',
        performed_by: profile?.full_name || 'System',
        performed_by_id: profile?.id || 'system',
        target_resource: 'Shift',
        target_id: variables.shiftId,
        timestamp: new Date().toISOString()
      });
    },
    onError: (err, newTodo, context: any) => {
      queryClient.setQueryData(['schedule'], context.previousSchedule);
      addToast({ type: 'error', title: "Assignment Failed", description: "Could not update shift." });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shiftsData: Partial<Shift>[]) => {
      const created = [];
      for (const s of shiftsData) {
        const { data } = await db.shifts.create(s as any);
        if (data) created.push(data);
      }
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      if (data.length > 0) {
        addToast({ type: 'success', title: "Shifts Created", description: `${data.length} shifts added to schedule.` });

        db.audit_logs.create({
          action: 'create',
          organization_id: organization?.id || '',
          description: `Created ${data.length} new shifts.`,
          performed_by: profile?.full_name || 'System',
          performed_by_id: profile?.id || 'system',
          target_resource: 'Shift',
          timestamp: new Date().toISOString()
        });
      } else {
        addToast({ type: 'error', title: "Creation Failed", description: "No shifts were created. Check your inputs." });
      }

      setIsAddOpen(false);
    },
    onError: (err: any) => {
      console.error("Shift creation error:", err);
      addToast({ type: 'error', title: "Error", description: err.message || "Failed to create shifts." });
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Shift> }) => {
      await db.shifts.update(id, updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      addToast({ type: 'success', title: "Shift Updated", description: "Changes saved successfully." });

      db.audit_logs.create({
        action: 'update',
        organization_id: organization?.id || '',
        description: `Updated shift details (Time/Rate).`,
        performed_by: profile?.full_name || 'System',
        performed_by_id: profile?.id || 'system',
        target_resource: 'Shift',
        target_id: variables.id,
        timestamp: new Date().toISOString()
      });

      setIsEditOpen(false);
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.shifts.delete(id);
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      addToast({ type: 'info', title: "Shift Deleted", description: "Shift removed from schedule." });

      db.audit_logs.create({
        action: 'delete',
        organization_id: organization?.id || '',
        description: `Deleted shift.`,
        performed_by: profile?.full_name || 'System',
        performed_by_id: profile?.id || 'system',
        target_resource: 'Shift',
        target_id: id,
        timestamp: new Date().toISOString()
      });

      setIsEditOpen(false);
    }
  });

  // --- LOGIC ---

  const getConflict = (shift: Shift, officerId: string | null) => {
    if (!officerId) return null;
    const officerShifts = shifts.filter(s => s.officer_id === officerId && s.id !== shift.id && s.status !== 'completed');
    const thisStart = new Date(shift.start_time).getTime();
    const thisEnd = new Date(shift.end_time).getTime();
    const hasOverlap = officerShifts.some(s => {
      const otherStart = new Date(s.start_time).getTime();
      const otherEnd = new Date(s.end_time).getTime();
      return (thisStart < otherEnd && thisEnd > otherStart);
    });
    if (hasOverlap) return 'Double Booked';
    return null;
  };

  const handleDragStart = (e: React.DragEvent, officer: Officer) => {
    if (!canEdit) return;
    setDraggedOfficer(officer);
    e.dataTransfer.setData('officerId', officer.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, shiftId: string) => {
    if (!canEdit) return;
    e.preventDefault();
    const officerId = e.dataTransfer.getData('officerId');
    if (!officerId) return;
    setDraggedOfficer(null);
    assignMutation.mutate({ shiftId, officerId });
  };

  const handleUnassign = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation();
    if (!canEdit) return;
    assignMutation.mutate({ shiftId, officerId: null });
  };

  // --- NAVIGATION LOGIC ---
  const handleNavigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (view === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
    else if (view === 'day') newDate.setDate(newDate.getDate() + direction);
    else if (view === 'month') newDate.setMonth(newDate.getMonth() + direction);
    else newDate.setDate(newDate.getDate() + (direction * 7)); // List default
    setCurrentDate(newDate);
  };

  const getHeaderDateLabel = () => {
    if (view === 'day') return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (view === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = getStartOfWeek(currentDate);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // --- ADD/EDIT SHIFT LOGIC ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newShift, setNewShift] = useState({
    site_id: '',
    officer_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    isRecurring: false,
    frequency: 'weekly',
    occurrences: 4,
    pay_rate: '',
    bill_rate: '',
    break_duration: 0
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    id: '',
    site_id: '',
    officer_id: '',
    date: '',
    start_time: '',
    end_time: '',
    pay_rate: '',
    bill_rate: '',
    break_duration: 0
  });

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const siteId = e.target.value;
    const site = sites.find(s => s.id === siteId);
    let billRate = '';
    if (site) {
      const client = clients.find(c => c.id === site.client_id);
      if (client && client.billing_settings) {
        billRate = client.billing_settings.standard_rate.toString();
      }
    }
    setNewShift(p => ({ ...p, site_id: siteId, bill_rate: billRate }));
  };

  const handleOfficerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const officerId = e.target.value;
    const officer = officers.find(o => o.id === officerId);
    let payRate = '';
    if (officer && officer.financials) {
      payRate = officer.financials.base_rate.toString();
    }
    setNewShift(p => ({ ...p, officer_id: officerId, pay_rate: payRate }));
  };

  const handleAddShift = async () => {
    if (!newShift.site_id || !newShift.date || !newShift.start_time || !newShift.end_time) {
      alert("Please fill in all required fields.");
      return;
    }

    const shiftsToCreate: Partial<Shift>[] = [];
    const [year, month, day] = newShift.date.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);

    const loopCount = newShift.isRecurring ? Number(newShift.occurrences) : 1;

    for (let i = 0; i < loopCount; i++) {
      const shiftDate = new Date(baseDate);

      if (newShift.isRecurring) {
        if (newShift.frequency === 'daily') shiftDate.setDate(shiftDate.getDate() + i);
        else if (newShift.frequency === 'weekly') shiftDate.setDate(shiftDate.getDate() + (i * 7));
      }

      const y = shiftDate.getFullYear();
      const m = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const d = String(shiftDate.getDate()).padStart(2, '0');
      const dateIso = `${y}-${m}-${d}`;

      const startDateTime = new Date(`${dateIso}T${newShift.start_time}`);
      const endDateTime = new Date(`${dateIso}T${newShift.end_time}`);

      if (endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

      shiftsToCreate.push({
        organization_id: organization?.id || '',
        site_id: newShift.site_id,
        officer_id: newShift.officer_id || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: newShift.officer_id ? 'assigned' : 'published',
        pay_rate: newShift.pay_rate ? Number(newShift.pay_rate) : null,
        bill_rate: newShift.bill_rate ? Number(newShift.bill_rate) : null,
        break_duration: newShift.break_duration ? Number(newShift.break_duration) : 0,
      });
    }

    createShiftMutation.mutate(shiftsToCreate);
    setNewShift({
      site_id: '',
      officer_id: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      isRecurring: false,
      frequency: 'weekly',
      occurrences: 4,
      pay_rate: '',
      bill_rate: '',
      break_duration: 0
    });
  };

  const handleEditOpen = (shift: Shift) => {
    setEditData({
      id: shift.id,
      site_id: shift.site_id,
      officer_id: shift.officer_id || '',
      date: formatDate(shift.start_time),
      start_time: formatTime(shift.start_time),
      end_time: formatTime(shift.end_time),
      pay_rate: shift.pay_rate?.toString() || '',
      bill_rate: shift.bill_rate?.toString() || '',
      break_duration: shift.break_duration || 0
    });
    setIsEditOpen(true);
  };

  const handleUpdateShift = () => {
    if (!editData.site_id || !editData.date || !editData.start_time || !editData.end_time) {
      alert("Required fields missing");
      return;
    }

    const [year, month, day] = editData.date.split('-').map(Number);
    const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const startDateTime = new Date(`${dateIso}T${editData.start_time}`);
    const endDateTime = new Date(`${dateIso}T${editData.end_time}`);
    if (endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

    const updates: Partial<Shift> = {
      site_id: editData.site_id,
      officer_id: editData.officer_id || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: editData.officer_id ? 'assigned' : 'published',
      pay_rate: editData.pay_rate !== '' ? Number(editData.pay_rate) : null,
      bill_rate: editData.bill_rate !== '' ? Number(editData.bill_rate) : null,
      break_duration: editData.break_duration ? Number(editData.break_duration) : 0
    };
    updateShiftMutation.mutate({ id: editData.id, updates });
  };

  const handleDeleteShift = () => {
    if (confirm("Are you sure you want to delete this shift?")) {
      deleteShiftMutation.mutate(editData.id);
    }
  };

  // --- RENDER HELPERS ---
  const ShiftCard: React.FC<{ shift: EnrichedShift, compact?: boolean }> = ({ shift, compact = false }) => {
    const conflict = getConflict(shift, shift.officer_id || (draggedOfficer?.id && draggedOfficer.id === shift.officer_id ? draggedOfficer.id : null));
    const isCompleted = new Date(shift.end_time) < new Date();

    // Density Styling
    const isCompact = compact || density === 'compact';
    const paddingClass = isCompact ? 'p-1.5' : 'p-3';
    const fontSizeClass = isCompact ? 'text-[10px]' : 'text-xs';

    return (
      <div
        onDragOver={(e) => handleDragOver(e)}
        onDrop={(e) => handleDrop(e, shift.id)}
        onClick={() => canEdit && handleEditOpen(shift)}
        className={clsx(
          "relative rounded-lg border shadow-sm transition-all group overflow-hidden hover:scale-[1.02] hover:shadow-md duration-200",
          paddingClass,
          isCompleted ? "bg-muted/40 border-border opacity-75" : "bg-card border-border",
          conflict ? "ring-2 ring-destructive border-destructive bg-destructive/10" : "",
          !shift.officer_id && canEdit ? "border-dashed border-2 hover:border-primary/50" : "",
          canEdit ? "cursor-pointer hover:border-primary/30" : ""
        )}
      >
        {/* Status Stripe */}
        <div className={clsx(
          "absolute left-0 top-0 bottom-0 w-1",
          shift.status === 'completed' ? 'bg-emerald-500' :
            shift.status === 'assigned' ? 'bg-blue-500' :
              'bg-amber-400'
        )} />

        <div className="pl-2">
          {shift.site?.client && (
            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5 truncate max-w-[120px]">
              {shift.site.client.name}
            </p>
          )}
          <div className="flex justify-between items-start mb-0.5">
            <p className={clsx("font-bold text-foreground truncate max-w-[120px]", fontSizeClass)} title={shift.site?.name}>{shift.site?.name}</p>
            {shift.break_duration && shift.break_duration > 0 && !isCompact ? (
              <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium flex items-center" title={`${shift.break_duration} min unpaid break`}>
                <Coffee className="h-3 w-3 mr-0.5" />
              </div>
            ) : null}
          </div>

          <div className={clsx("flex items-center gap-1.5 text-muted-foreground", fontSizeClass, isCompact ? "mb-1" : "mb-2")}>
            <Clock className={clsx("h-3 w-3", isCompact && "h-2.5 w-2.5")} />
            <span>{new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {shift.officer ? (
            <div className={clsx("flex items-center gap-2 border-t border-dashed border-border", isCompact ? "pt-1 mt-0.5" : "pt-2 mt-2")}>
              {!isCompact && <Avatar fallback={shift.officer.full_name[0]} className="h-5 w-5 text-[10px] border border-border" />}
              <span className={clsx("font-medium truncate flex-1 text-foreground/80", fontSizeClass)}>{shift.officer.full_name.split(' ')[0]}</span>
              {canEdit && !compact && (
                <button
                  onClick={(e) => handleUnassign(e, shift.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className={clsx("border-t border-dashed border-border text-center", isCompact ? "mt-1 pt-0.5" : "mt-2 pt-2")}>
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Unassigned</span>
            </div>
          )}
        </div>

        {conflict && <div className="absolute top-1 right-1"><AlertCircle className="h-4 w-4 text-destructive" /></div>}
      </div>
    );
  };

  // --- VIEW COMPONENTS ---

  const WeekView = () => {
    const weekStart = getStartOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    const shiftsByDay = weekDays.map(day => {
      const dayKey = formatDateKey(day);
      return {
        date: day,
        items: shifts.filter(s => formatDateKey(new Date(s.start_time)) === dayKey).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      };
    });

    return (
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-muted/20 relative shadow-inner">
        <div className="grid grid-cols-7 min-h-full min-w-[1000px] divide-x divide-border">
          {shiftsByDay.map(({ date, items }) => {
            const isToday = formatDateKey(date) === formatDateKey(new Date());
            return (
              <div key={date.toISOString()} className="flex flex-col bg-background/50">
                <div className={clsx(
                  "p-3 text-center border-b border-border sticky top-0 z-10 backdrop-blur-md bg-background/80",
                  isToday ? "border-b-primary/50 bg-primary/5" : ""
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <div className={clsx("mx-auto h-8 w-8 flex items-center justify-center rounded-full mt-1 text-sm font-bold", isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground")}>
                    {date.getDate()}
                  </div>
                </div>

                <div className={clsx("space-y-2 pb-8", density === 'compact' ? "p-1" : "p-2")}>
                  {items.map(shift => <ShiftCard key={shift.id} shift={shift} />)}
                  {canEdit && (
                    <button
                      className="w-full py-2 rounded border border-dashed border-border text-muted-foreground/50 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-xs flex items-center justify-center gap-1 opacity-0 hover:opacity-100"
                      onClick={() => { setNewShift(p => ({ ...p, date: formatDateKey(date) })); setIsAddOpen(true); }}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const DayView = () => {
    // ... (No changes needed here for basic functionality, inherits ShiftCard)
    // Reuse existing DayView logic from previous file content
    const [showEmpty, setShowEmpty] = useState(false);
    const dayKey = formatDateKey(currentDate);
    const dayShifts = shifts.filter(s => formatDateKey(new Date(s.start_time)) === dayKey);
    const totalShifts = dayShifts.length;
    const totalHours = dayShifts.reduce((acc, s) => {
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.end_time).getTime();
      const breakHrs = (s.break_duration || 0) / 60;
      return acc + (((end - start) / (1000 * 60 * 60)) - breakHrs);
    }, 0);
    const uniqueOfficers = new Set(dayShifts.map(s => s.officer_id).filter(Boolean)).size;
    let shiftsBySite = sites.map(site => ({
      site,
      items: dayShifts.filter(s => s.site_id === site.id).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    }));
    shiftsBySite.sort((a, b) => {
      if (a.items.length > 0 && b.items.length === 0) return -1;
      if (a.items.length === 0 && b.items.length > 0) return 1;
      return a.site.name.localeCompare(b.site.name);
    });
    if (!showEmpty) { shiftsBySite = shiftsBySite.filter(g => g.items.length > 0); }

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background rounded-xl border border-border shadow-sm">
        <div className="bg-muted/30 border-b border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-8">
            <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Shifts</span><span className="text-2xl font-bold tracking-tight">{totalShifts}</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Hours</span><span className="text-2xl font-bold tracking-tight">{totalHours.toFixed(1)}</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Officers</span><span className="text-2xl font-bold tracking-tight">{uniqueOfficers}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2 cursor-pointer select-none bg-card px-3 py-1.5 rounded-full border border-border shadow-sm hover:bg-accent/50 transition-colors">
              <input type="checkbox" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} className="rounded border-input text-primary focus:ring-primary" />
              Show Empty Sites
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {shiftsBySite.map(({ site, items }) => (
              <Card key={site.id} className={clsx("h-fit transition-all hover:border-primary/30", items.length === 0 ? "opacity-60 grayscale" : "")}>
                <div className="p-4 border-b border-border bg-card flex justify-between items-start">
                  <div>
                    {(() => {
                      const client = clients.find(c => c.id === site.client_id);
                      return client ? <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">{client.name}</div> : null;
                    })()}
                    <h4 className="font-bold text-sm tracking-tight">{site.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><MapPin className="h-3 w-3" /> {site.address}</div>
                  </div>
                  <Badge variant={items.length > 0 ? "default" : "secondary"} className="text-[10px] h-5">{items.length}</Badge>
                </div>
                <CardContent className="p-3 space-y-3 bg-muted/20 min-h-[100px]">
                  {items.map(shift => <ShiftCard key={shift.id} shift={shift} compact />)}
                  {canEdit && (
                    <Button variant="ghost" size="sm" className="w-full border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary hover:bg-card h-9 transition-all text-xs" onClick={() => { setNewShift(p => ({ ...p, site_id: site.id, date: formatDateKey(currentDate) })); setIsAddOpen(true); }}>
                      <Plus className="h-3 w-3 mr-1" /> Add Shift
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const MonthView = () => {
    // Reuse logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDayOfMonth.getDay();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-3 text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-r border-border last:border-r-0 bg-muted/30">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr min-h-[600px]">
          {days.map((date, i) => {
            if (!date) return <div key={i} className="bg-muted/10 border-r border-b border-border"></div>;
            const dayKey = formatDateKey(date);
            const dayShifts = shifts.filter(s => formatDateKey(new Date(s.start_time)) === dayKey);
            const isToday = formatDateKey(new Date()) === dayKey;
            return (
              <div key={dayKey} className={clsx("min-h-[100px] p-2 border-r border-b border-border transition-colors hover:bg-muted/20 cursor-pointer group flex flex-col", isToday ? "bg-primary/5" : "")} onClick={() => { setCurrentDate(date); setView('day'); }}>
                <div className="flex justify-between items-start mb-2"><span className={clsx("text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full", isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}>{date.getDate()}</span>{dayShifts.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{dayShifts.length}</Badge>}</div>
                <div className="space-y-1 flex-1">
                  {dayShifts.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 text-[10px] px-1.5 py-1 rounded bg-background border border-border shadow-sm text-foreground truncate">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.status === 'completed' ? 'bg-emerald-500' : s.officer_id ? 'bg-blue-500' : 'bg-amber-400'}`} />
                      <span className="truncate flex-1">{s.site?.name}</span>
                    </div>
                  ))}
                  {dayShifts.length > 3 && <div className="text-[10px] text-muted-foreground text-center font-medium">+{dayShifts.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // List View code remains similar, omitted for brevity but would be included in full build.
  // Re-using the simplified ListView structure for this change block.
  const ListView = () => {
    const weekStart = getStartOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 7);
    const listShifts = shifts.filter(s => { const d = new Date(s.start_time); return d >= weekStart && d < weekEnd; }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return (
      <Card className="flex-1 overflow-hidden flex flex-col border-none shadow-none bg-transparent">
        <div className="overflow-auto flex-1 rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Date</th>
                <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Time</th>
                <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Site</th>
                <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Officer</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listShifts.map(shift => (
                <tr key={shift.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">{new Date(shift.start_time).toLocaleDateString()}</td>
                  <td className="p-4">{formatTime(shift.start_time)}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      {shift.site?.client && (
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">{shift.site.client.name}</span>
                      )}
                      <span className="font-medium">{shift.site?.name}</span>
                    </div>
                  </td>
                  <td className="p-4">{shift.officer?.full_name || 'Unassigned'}</td>
                  <td className="p-4 text-right"><Button variant="ghost" size="sm" onClick={() => handleEditOpen(shift)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-card border border-border rounded-lg shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => handleNavigate(-1)} className="hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 font-bold min-w-[200px] text-center text-sm">
              {getHeaderDateLabel()}
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleNavigate(1)} className="hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border">
            <Button variant={view === 'day' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => setView('day')}><Columns className="h-3 w-3 mr-2" /> Day</Button>
            <Button variant={view === 'week' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => setView('week')}><CalendarDays className="h-3 w-3 mr-2" /> Week</Button>
            <Button variant={view === 'month' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => setView('month')}><CalendarIcon className="h-3 w-3 mr-2" /> Month</Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => setView('list')}><ListIcon className="h-3 w-3 mr-2" /> List</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Density Toggle */}
          <div className="flex items-center bg-card border border-border rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setDensity('compact')}
              className={clsx("p-1.5 rounded-md transition-colors", density === 'compact' ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
              title="Compact View"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDensity('comfortable')}
              className={clsx("p-1.5 rounded-md transition-colors", density === 'comfortable' ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
              title="Comfortable View"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['schedule'] })} variant="outline" size="sm" className="text-xs">Refresh</Button>
          {canEdit && <Button size="sm" className="gap-2 text-xs shadow-sm" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4" /> Add Shift</Button>}
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* SIDEBAR (Visible only in Week/Day view for Drag & Drop context) */}
        {canEdit && (view === 'week' || view === 'day') && (
          <div className="w-64 shrink-0 flex flex-col gap-4 bg-card rounded-xl border border-border shadow-sm p-4 overflow-hidden hidden lg:flex">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Officers</h3>
              <Badge variant="outline" className="text-[10px]">{officers.filter(o => o.employment_status === 'active').length}</Badge>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
              {officers.filter(o => o.employment_status === 'active').map(officer => (
                <div
                  key={officer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, officer)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-grab hover:bg-accent active:cursor-grabbing transition-all hover:shadow-sm group hover:-translate-y-0.5"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
                  <Avatar fallback={officer.full_name.charAt(0)} className="h-8 w-8 text-xs border border-border" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate">{officer.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{officer.badge_number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN BOARD */}
        {view === 'week' && <WeekView />}
        {view === 'day' && <DayView />}
        {view === 'month' && <MonthView />}
        {view === 'list' && <ListView />}
      </div>

      {/* CREATE SHIFT MODAL (Kept as Dialog for now, or could convert to Sheet) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create New Shift</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="space-y-1">
              <Label>Site Location</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newShift.site_id} onChange={handleSiteChange}>
                <option value="">Select Site...</option>
                {sites.map(s => {
                  const client = clients.find(c => c.id === s.client_id);
                  return <option key={s.id} value={s.id}>{client ? `${client.name} - ` : ''}{s.name}</option>
                })}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Assigned Officer (Optional)</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newShift.officer_id} onChange={handleOfficerChange}>
                <option value="">Open Shift</option>
                {officers.filter(o => o.employment_status === 'active').map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Pay Rate ($/hr)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" className="pl-9" value={newShift.pay_rate} onChange={(e) => setNewShift(p => ({ ...p, pay_rate: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Bill Rate ($/hr)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" className="pl-9" value={newShift.bill_rate} onChange={(e) => setNewShift(p => ({ ...p, bill_rate: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="space-y-1"><Label>Date</Label><Input type="date" value={newShift.date} onChange={(e) => setNewShift(p => ({ ...p, date: e.target.value }))} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Start Time</Label><Input type="time" value={newShift.start_time} onChange={(e) => setNewShift(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Time</Label><Input type="time" value={newShift.end_time} onChange={(e) => setNewShift(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="isRecurring"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={newShift.isRecurring}
                  onChange={(e) => setNewShift(p => ({ ...p, isRecurring: e.target.checked }))}
                />
                <Label htmlFor="isRecurring" className="cursor-pointer mb-0">Recurring Shift</Label>
              </div>

              {newShift.isRecurring && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <Label>Frequency</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newShift.frequency}
                      onChange={(e) => setNewShift(p => ({ ...p, frequency: e.target.value as any }))}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Occurrences</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={newShift.occurrences}
                      onChange={(e) => setNewShift(p => ({ ...p, occurrences: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddShift} disabled={createShiftMutation.isPending}>{createShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT SHIFT SIDE DRAWER (Sheet) */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Shift Details</SheetTitle>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-1">
              <Label>Site Location</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={editData.site_id} onChange={(e) => setEditData(p => ({ ...p, site_id: e.target.value }))}>
                <option value="">Select Site...</option>
                {sites.map(s => {
                  const client = clients.find(c => c.id === s.client_id);
                  return <option key={s.id} value={s.id}>{client ? `${client.name} - ` : ''}{s.name}</option>
                })}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Assigned Officer</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={editData.officer_id} onChange={(e) => setEditData(p => ({ ...p, officer_id: e.target.value }))}>
                <option value="">Open Shift</option>
                {officers.filter(o => o.employment_status === 'active').map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-border">
              <div className="space-y-1">
                <Label>Pay Rate ($/hr)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={editData.pay_rate}
                    onChange={(e) => setEditData(p => ({ ...p, pay_rate: e.target.value }))}
                    className="pl-8 bg-background"
                    placeholder="Standard"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Bill Rate ($/hr)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={editData.bill_rate}
                    onChange={(e) => setEditData(p => ({ ...p, bill_rate: e.target.value }))}
                    className="pl-8 bg-background"
                    placeholder="Standard"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={editData.date} onChange={(e) => setEditData(p => ({ ...p, date: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Start Time</Label><Input type="time" value={editData.start_time} onChange={(e) => setEditData(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Time</Label><Input type="time" value={editData.end_time} onChange={(e) => setEditData(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>

            <div className="space-y-1"><Label>Unpaid Break (min)</Label><Input type="number" min="0" value={editData.break_duration} onChange={(e) => setEditData(p => ({ ...p, break_duration: parseInt(e.target.value) || 0 }))} /></div>
          </div>

          <SheetFooter>
            <div className="flex w-full justify-between items-center gap-4">
              <Button variant="destructive" onClick={handleDeleteShift} disabled={deleteShiftMutation.isPending}>
                {deleteShiftMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateShift} disabled={updateShiftMutation.isPending}>
                  {updateShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
