
import React, { useEffect, useState, useMemo } from 'react';
import { Card, Badge, Button, Avatar, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from '../components/ui';
import { db } from '../lib/db';
import { TimeEntry, Shift } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Download, ChevronLeft, ChevronRight, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Filter, XCircle, Search, Clock, Calendar, Plus, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

type FilterConfig = {
  date: string;
  status: string;
  officer: string;
};

export default function Timesheets() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';

  // --- QUERIES ---
  const { data: entries = [], isLoading: isLoadingEntries } = useQuery({
      queryKey: ['timeEntries'],
      queryFn: async () => {
          const { data } = await db.getFullTimeEntries();
          let loaded = data || [];
          if (!isAdmin && profile?.id) {
              loaded = loaded.filter(e => e.officer_id === profile.id);
          }
          return loaded;
      }
  });

  const { data: officers = [] } = useQuery({
      queryKey: ['officers'],
      queryFn: async () => {
          const { data } = await db.officers.select();
          return data || [];
      },
      enabled: isAdmin
  });

  const { data: sites = [] } = useQuery({
      queryKey: ['sites'],
      queryFn: async () => {
          const { data } = await db.sites.select();
          return data || [];
      }
  });

  const isLoading = isLoadingEntries;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'clock_in', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterConfig>({ date: '', status: 'all', officer: 'all' });
  const [showFilters, setShowFilters] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [formData, setFormData] = useState({
    clock_in: '',
    clock_out: '',
    status: 'pending' as TimeEntry['status']
  });

  // Add Manual Entry State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    officer_id: '',
    site_id: '',
    clock_in: '',
    clock_out: '',
    status: 'approved' as TimeEntry['status'],
    break_duration: 0
  });

  // --- MUTATIONS ---
  const updateEntryMutation = useMutation({
      mutationFn: async ({ id, updates }: { id: string, updates: Partial<TimeEntry> }) => {
          await db.time_entries.update(id, updates);
      },
      onSuccess: (data, variables) => {
          queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
          setIsEditOpen(false);
          
          if (variables.updates.status) {
              // Audit Log for Approval/Rejection
              db.audit_logs.create({
                  action: 'update',
                  description: `Set Time Entry status to ${variables.updates.status}`,
                  performed_by: profile?.full_name || 'System',
                  performed_by_id: profile?.id || 'system',
                  target_resource: 'TimeEntry',
                  target_id: variables.id,
                  timestamp: new Date().toISOString()
              });
          }
      }
  });

  const createEntryMutation = useMutation({
      mutationFn: async (entryData: any) => {
          const { officer_id, site_id, clock_in, clock_out, status, break_duration } = entryData;
          
          // Create a shift container for this manual entry
          const start = new Date(clock_in);
          const end = new Date(clock_out);
          
          const { data: shift } = await db.shifts.create({
             site_id,
             officer_id,
             start_time: clock_in,
             end_time: clock_out,
             status: 'completed',
             break_duration
          });

          if (!shift) throw new Error("Failed to create shift container");

          const durationMs = end.getTime() - start.getTime();
          const durationHours = (durationMs / (1000 * 60 * 60)) - (break_duration / 60);

          const { data } = await db.time_entries.create({
              shift_id: shift.id,
              officer_id,
              clock_in,
              clock_out,
              total_hours: Math.max(0, durationHours),
              status: status
          });
          
          return data;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
          setIsAddOpen(false);
          // Audit Log
          db.audit_logs.create({
            action: 'create',
            description: `Manual Time Entry added.`,
            performed_by: profile?.full_name || 'System',
            performed_by_id: profile?.id || 'system',
            target_resource: 'TimeEntry',
            timestamp: new Date().toISOString()
        });
      }
  });

  // Helper functions
  const handleEditOpen = (entry: any) => {
      setFormData({
          clock_in: new Date(entry.clock_in).toISOString().slice(0, 16), // datetime-local format
          clock_out: entry.clock_out ? new Date(entry.clock_out).toISOString().slice(0, 16) : '',
          status: entry.status
      });
      setSelectedEntry(entry);
      setIsEditOpen(true);
  };

  const handleUpdateEntry = () => {
      if(!selectedEntry) return;
      const start = new Date(formData.clock_in);
      const end = formData.clock_out ? new Date(formData.clock_out) : new Date();
      const durationMs = end.getTime() - start.getTime();
      const breakMins = selectedEntry.shift?.break_duration || 0;
      const totalHours = (durationMs / (1000 * 60 * 60)) - (breakMins / 60);

      updateEntryMutation.mutate({
          id: selectedEntry.id,
          updates: {
              clock_in: new Date(formData.clock_in).toISOString(),
              clock_out: formData.clock_out ? new Date(formData.clock_out).toISOString() : undefined,
              status: formData.status,
              total_hours: Math.max(0, totalHours)
          }
      });
  };

  const handleAddSubmit = () => {
      if(!newEntry.officer_id || !newEntry.site_id || !newEntry.clock_in || !newEntry.clock_out) return;
      createEntryMutation.mutate(newEntry);
  };

  // Filter & Sort Logic
  const filteredEntries = entries.filter((e: any) => {
      const matchSearch = e.officer?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      // Add more filters if needed
      return matchSearch;
  }).sort((a: any, b: any) => {
      const dateA = new Date(a[sortConfig.key]).getTime();
      const dateB = new Date(b[sortConfig.key]).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const currentData = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Time & Attendance</h2>
                <p className="text-sm text-muted-foreground">Review and approve officer timesheets.</p>
            </div>
            {isAdmin && (
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
                    <Button className="gap-2" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4" /> Add Entry</Button>
                </div>
            )}
        </div>

        {/* Filters & Table */}
        <Card>
            {/* Filters Bar */}
            <div className="p-4 border-b flex justify-between gap-4 flex-col sm:flex-row">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search officer..." 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSortConfig({ key: 'clock_in', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                        <ArrowUpDown className="h-4 w-4 mr-1" /> Date
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                        <tr>
                            <th className="p-4 min-w-[150px]">Officer</th>
                            <th className="p-4 min-w-[150px]">Site</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 min-w-[150px]">Shift Time</th>
                            <th className="p-4">Total Hrs</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {currentData.map((entry: any) => (
                            <tr key={entry.id} className="hover:bg-muted/30">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar fallback={entry.officer?.full_name[0]} className="h-8 w-8" />
                                        <span className="font-medium whitespace-nowrap">{entry.officer?.full_name}</span>
                                    </div>
                                </td>
                                <td className="p-4">{entry.shift?.site?.name}</td>
                                <td className="p-4 whitespace-nowrap">{new Date(entry.clock_in).toLocaleDateString()}</td>
                                <td className="p-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(entry.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Active'}
                                </td>
                                <td className="p-4 font-bold">{entry.total_hours.toFixed(2)}</td>
                                <td className="p-4">
                                    <Badge variant={entry.status === 'approved' ? 'success' : entry.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                                        {entry.status}
                                    </Badge>
                                </td>
                                <td className="p-4 text-right">
                                    {isAdmin && (
                                        <Button variant="ghost" size="sm" onClick={() => handleEditOpen(entry)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {currentData.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No entries found.</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}
        </Card>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Clock In</Label>
                            <Input type="datetime-local" value={formData.clock_in} onChange={e => setFormData(p => ({...p, clock_in: e.target.value}))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Clock Out</Label>
                            <Input type="datetime-local" value={formData.clock_out} onChange={e => setFormData(p => ({...p, clock_out: e.target.value}))} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Status</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => setFormData(p => ({...p, status: e.target.value as any}))}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateEntry} disabled={updateEntryMutation.isPending}>
                        {updateEntryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

         {/* Add Modal */}
         <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Manual Entry</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-1">
                        <Label>Officer</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newEntry.officer_id} onChange={(e) => setNewEntry(p => ({...p, officer_id: e.target.value}))}>
                            <option value="">Select Officer...</option>
                            {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label>Site</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newEntry.site_id} onChange={(e) => setNewEntry(p => ({...p, site_id: e.target.value}))}>
                            <option value="">Select Site...</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Clock In</Label>
                            <Input type="datetime-local" value={newEntry.clock_in} onChange={e => setNewEntry(p => ({...p, clock_in: e.target.value}))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Clock Out</Label>
                            <Input type="datetime-local" value={newEntry.clock_out} onChange={e => setNewEntry(p => ({...p, clock_out: e.target.value}))} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Break (minutes)</Label>
                        <Input type="number" value={newEntry.break_duration} onChange={e => setNewEntry(p => ({...p, break_duration: parseInt(e.target.value) || 0}))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSubmit} disabled={createEntryMutation.isPending}>
                        {createEntryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
