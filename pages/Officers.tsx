
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Avatar, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Tabs, TabsList, TabsTrigger, TabsContent, Label, Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui';
import { db } from '../lib/db';
import { Officer, Certification } from '../lib/types';
import { Search, Shield, ChevronLeft, ChevronRight, UserPlus, Loader2, Phone, Mail, Briefcase, ArrowLeft, Printer, Edit, Save, Plus, Trash2, FileCheck, AlertCircle, XCircle, LayoutGrid, List, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type SortKey = 'full_name' | 'badge_number' | 'employment_status' | 'email';

export default function Officers() {
    const { profile, organization } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'full_name', direction: 'asc' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = viewMode === 'list' ? 10 : 6;

    // Add Officer Sheet State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newOfficer, setNewOfficer] = useState({
        full_name: '',
        email: '',
        badge_number: '',
        phone: '',
        skills: '',
        employment_status: 'active' as Officer['employment_status']
    });

    const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);

    // Financial State (Local Editing)
    const [financials, setFinancials] = useState({
        base_rate: 0,
        overtime_rate: 0,
        deductions: [] as Array<{ name: string, amount: number }>
    });
    const [isSavingFinance, setIsSavingFinance] = useState(false);
    const [newDeduction, setNewDeduction] = useState({ name: '', amount: '' });

    // Certifications State
    const [isAddCertOpen, setIsAddCertOpen] = useState(false);
    const [newCert, setNewCert] = useState<Partial<Certification>>({
        name: '',
        number: '',
        type: 'guard_card',
        expiry_date: '',
        status: 'active'
    });

    // Update local financial state when officer is selected
    useEffect(() => {
        if (selectedOfficer) {
            setFinancials({
                base_rate: selectedOfficer.financials?.base_rate || 20,
                overtime_rate: selectedOfficer.financials?.overtime_rate || 30,
                deductions: selectedOfficer.financials?.deductions || []
            });
        }
    }, [selectedOfficer]);

    // --- QUERIES ---
    const { data: officers = [], isLoading: isLoadingOfficers } = useQuery({
        queryKey: ['officers', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.officers.select(organization.id);
            return data || [];
        }
    });

    const { data: officerDetails } = useQuery({
        queryKey: ['officerDetails', selectedOfficer?.id],
        enabled: !!selectedOfficer,
        queryFn: async () => {
            if (!selectedOfficer || !organization) return null;
            const [shiftsRes, entriesRes, incidentsRes] = await Promise.all([
                db.getFullSchedule(organization.id),
                db.getFullTimeEntries(organization.id),
                db.getFullIncidents(organization.id)
            ]);

            const shifts = (shiftsRes.data || []).filter(s => s.officer_id === selectedOfficer.id);
            // Sort shifts: Future first, then past
            shifts.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

            const entries = (entriesRes.data || []).filter(e => e.officer_id === selectedOfficer.id);
            const incidents = (incidentsRes.data || []).filter(i => i.officer_id === selectedOfficer.id);
            const totalHours = entries.reduce((acc, curr) => acc + curr.total_hours, 0);

            return {
                shifts,
                entries,
                incidents,
                stats: {
                    totalHours,
                    incidentCount: incidents.length,
                    shiftCount: shifts.length
                }
            };
        }
    });

    // --- MUTATION ---
    const createOfficerMutation = useMutation({
        mutationFn: async (officerData: any) => {
            const { data, error } = await db.officers.create(officerData);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['officers'] });
            addToast({ type: 'success', title: "Officer Added", description: `${data.full_name} has been onboarded.` });

            db.audit_logs.create({
                action: 'create',
                organization_id: organization?.id || '',
                description: `Onboarded new officer: ${data.full_name}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Officer',
                target_id: data.id,
                timestamp: new Date().toISOString()
            });

            setIsAddOpen(false);
            setNewOfficer({
                full_name: '',
                email: '',
                badge_number: '',
                phone: '',
                skills: '',
                employment_status: 'active'
            });
        }
    });

    const updateOfficerMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Officer> }) => {
            await db.officers.update(id, updates);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['officers'] });
            addToast({ type: 'success', title: "Profile Updated", description: "Changes saved." });

            db.audit_logs.create({
                action: 'update',
                organization_id: organization?.id || '',
                description: `Updated officer profile details.`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Officer',
                target_id: variables.id,
                timestamp: new Date().toISOString()
            });
        }
    });

    const handleAddOfficer = () => {
        if (!newOfficer.full_name || !newOfficer.badge_number) {
            alert("Name and Badge Number are required.");
            return;
        }
        const officerData = {
            ...newOfficer,
            organization_id: organization?.id,
            skills: newOfficer.skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
        };
        createOfficerMutation.mutate(officerData);
    };

    const handleSaveFinancials = async () => {
        if (!selectedOfficer) return;
        setIsSavingFinance(true);
        const updates = {
            financials: {
                base_rate: Number(financials.base_rate),
                overtime_rate: Number(financials.overtime_rate),
                deductions: financials.deductions
            }
        };

        await db.officers.update(selectedOfficer.id, updates);

        // Audit Log
        db.audit_logs.create({
            action: 'update',
            organization_id: organization?.id || '',
            description: `Updated financials for officer: ${selectedOfficer.full_name}`,
            performed_by: profile?.full_name || 'System',
            performed_by_id: profile?.id || 'system',
            target_resource: 'Officer',
            target_id: selectedOfficer.id,
            timestamp: new Date().toISOString()
        });

        // Update local view
        setSelectedOfficer(prev => prev ? ({ ...prev, ...updates }) : null);
        queryClient.invalidateQueries({ queryKey: ['officers'] });
        setIsSavingFinance(false);
        addToast({ type: 'success', title: "Financials Saved", description: "Rates updated successfully." });
    };

    const addDeduction = () => {
        if (!newDeduction.name || !newDeduction.amount) return;
        setFinancials(prev => ({
            ...prev,
            deductions: [...prev.deductions, { name: newDeduction.name, amount: Number(newDeduction.amount) }]
        }));
        setNewDeduction({ name: '', amount: '' });
    };

    const removeDeduction = (index: number) => {
        setFinancials(prev => ({
            ...prev,
            deductions: prev.deductions.filter((_, i) => i !== index)
        }));
    };

    // --- CERTIFICATION HANDLERS ---
    const handleAddCertification = () => {
        if (!selectedOfficer || !newCert.name || !newCert.expiry_date) return;

        const cert: Certification = {
            id: Math.random().toString(36).substr(2, 9),
            name: newCert.name!,
            number: newCert.number || 'N/A',
            issue_date: new Date().toISOString(), // Default to today for demo
            expiry_date: new Date(newCert.expiry_date!).toISOString(),
            type: newCert.type as any,
            status: 'active'
        };

        const updatedCerts = [...(selectedOfficer.certifications || []), cert];
        updateOfficerMutation.mutate({
            id: selectedOfficer.id,
            updates: { certifications: updatedCerts }
        });

        setSelectedOfficer(prev => prev ? ({ ...prev, certifications: updatedCerts }) : null);
        setIsAddCertOpen(false);
        setNewCert({ name: '', number: '', type: 'guard_card', expiry_date: '', status: 'active' });
    };

    const handleDeleteCertification = (certId: string) => {
        if (!selectedOfficer) return;
        if (!confirm("Are you sure you want to remove this license?")) return;

        const updatedCerts = (selectedOfficer.certifications || []).filter(c => c.id !== certId);
        updateOfficerMutation.mutate({
            id: selectedOfficer.id,
            updates: { certifications: updatedCerts }
        });

        setSelectedOfficer(prev => prev ? ({ ...prev, certifications: updatedCerts }) : null);
    };

    const getCertStatusColor = (cert: Certification) => {
        const now = new Date();
        const expiry = new Date(cert.expiry_date);
        const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return 'destructive'; // Expired
        if (daysUntil < 30) return 'warning'; // Expiring soon
        return 'success'; // Valid
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredOfficers = officers.filter(o =>
        o.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.badge_number.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        const aVal = String(a[sortConfig.key as keyof Officer] || '').toLowerCase();
        const bVal = String(b[sortConfig.key as keyof Officer] || '').toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(filteredOfficers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentOfficers = filteredOfficers.slice(startIndex, startIndex + itemsPerPage);

    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };


    // --- FULL PAGE PROFILE VIEW ---
    if (selectedOfficer) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedOfficer(null)} className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" /> Back to Directory
                        </Button>
                    </div>

                    <Card className="border-l-4 border-l-primary overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"></div>
                        <div className="px-8 pb-8">
                            <div className="relative flex justify-between items-end -mt-12 mb-6">
                                <div className="flex items-end gap-6">
                                    <Avatar fallback={selectedOfficer.full_name.charAt(0)} className="h-32 w-32 border-4 border-background text-4xl shadow-md" />
                                    <div className="mb-2 space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight">{selectedOfficer.full_name}</h1>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-muted-foreground font-normal">
                                                <Shield className="h-3 w-3 mr-1" /> Badge #{selectedOfficer.badge_number}
                                            </Badge>
                                            <Badge variant={selectedOfficer.employment_status === 'active' ? 'success' : 'secondary'} className="uppercase">
                                                {selectedOfficer.employment_status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Printer className="h-4 w-4" /> Print
                                    </Button>
                                    <Button size="sm" className="gap-2">
                                        <Edit className="h-4 w-4" /> Edit Profile
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</p>
                                    <p className="text-sm font-medium">{selectedOfficer.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                                    <p className="text-sm font-medium">{selectedOfficer.phone}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Hours (Lifetime)</p>
                                    <p className="text-sm font-medium">{officerDetails?.stats.totalHours.toFixed(1) || 0} Hrs</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incident Reports</p>
                                    <p className="text-sm font-medium">{officerDetails?.stats.incidentCount || 0}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList className="bg-white border p-1 h-auto gap-2">
                            <TabsTrigger value="overview" className="h-9">Overview</TabsTrigger>
                            <TabsTrigger value="schedule" className="h-9">Schedule & Shifts</TabsTrigger>
                            <TabsTrigger value="history" className="h-9">Activity Log</TabsTrigger>
                            <TabsTrigger value="financials" className="h-9">Financials</TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Certifications Card */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-base font-semibold">Licenses & Certifications</CardTitle>
                                        <Button variant="outline" size="sm" onClick={() => setIsAddCertOpen(true)} className="h-7 text-xs gap-1">
                                            <Plus className="h-3 w-3" /> Add License
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y">
                                            {selectedOfficer.certifications?.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No certifications on file.</p>}
                                            {selectedOfficer.certifications?.map(cert => {
                                                const status = getCertStatusColor(cert);
                                                return (
                                                    <div key={cert.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-1 p-1.5 rounded-full ${status === 'destructive' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                                                <FileCheck className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{cert.name}</p>
                                                                <p className="text-xs text-muted-foreground font-mono">{cert.number}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-xs font-semibold ${status === 'destructive' ? 'text-red-600' : status === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>
                                                                {new Date(cert.expiry_date).toLocaleDateString()}
                                                            </p>
                                                            <button onClick={() => handleDeleteCertification(cert.id)} className="text-[10px] text-muted-foreground hover:text-red-600 underline">Remove</button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Skills & Notes */}
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Specialized Skills</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOfficer.skills.length === 0 && <p className="text-sm text-muted-foreground">No skills listed.</p>}
                                                {selectedOfficer.skills.map((skill, i) => (
                                                    <Badge key={i} variant="secondary" className="px-3 py-1 text-xs uppercase tracking-wide bg-slate-100 text-slate-700 hover:bg-slate-200">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Internal Notes</CardTitle></CardHeader>
                                        <CardContent>
                                            <textarea
                                                className="w-full min-h-[100px] text-sm p-3 rounded-md border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                                                placeholder="Add internal notes about this officer..."
                                            />
                                            <div className="flex justify-end mt-2">
                                                <Button size="sm" variant="ghost" className="text-xs h-7">Save Note</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        {/* SCHEDULE TAB */}
                        <TabsContent value="schedule">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Upcoming & Recent Shifts</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {officerDetails?.shifts.length === 0 && <p className="p-8 text-center text-muted-foreground">No shifts assigned.</p>}
                                        {officerDetails?.shifts.map(shift => {
                                            const isFuture = new Date(shift.start_time) > new Date();
                                            return (
                                                <div key={shift.id} className={`p-4 flex items-center justify-between ${isFuture ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg ${isFuture ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                                            <Calendar className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{new Date(shift.start_time).toLocaleDateString()} at {shift.site?.name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant={shift.status === 'completed' ? 'success' : shift.status === 'assigned' ? 'default' : 'secondary'} className="capitalize">
                                                        {isFuture ? 'Upcoming' : shift.status}
                                                    </Badge>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* HISTORY TAB */}
                        <TabsContent value="history">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {officerDetails?.entries.map(entry => (
                                            <div key={entry.id} className="p-4 flex items-start gap-4">
                                                <div className="mt-1 p-1.5 rounded-full bg-green-100 text-green-700"><CheckCircle2 className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-sm font-medium">Clocked in at {entry.shift?.site?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(entry.clock_in).toLocaleString()} • {entry.total_hours.toFixed(2)} hrs logged</p>
                                                </div>
                                            </div>
                                        ))}
                                        {officerDetails?.incidents.map(incident => (
                                            <div key={incident.id} className="p-4 flex items-start gap-4 bg-red-50/50">
                                                <div className="mt-1 p-1.5 rounded-full bg-red-100 text-red-700"><AlertCircle className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-sm font-medium text-red-900">Reported {incident.type} Incident</p>
                                                    <p className="text-xs text-red-700/70">{new Date(incident.reported_at).toLocaleString()} • {incident.site?.name}</p>
                                                    <p className="text-xs mt-1 text-slate-600 italic">"{incident.description}"</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(officerDetails?.entries.length === 0 && officerDetails?.incidents.length === 0) && (
                                            <p className="p-8 text-center text-muted-foreground">No activity history found.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* FINANCIALS TAB */}
                        <TabsContent value="financials">
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Pay Rates</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Base Hourly Rate</Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    className="pl-8"
                                                    value={financials.base_rate}
                                                    onChange={(e) => setFinancials(p => ({ ...p, base_rate: Number(e.target.value) }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Overtime Rate</Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    className="pl-8"
                                                    value={financials.overtime_rate}
                                                    onChange={(e) => setFinancials(p => ({ ...p, overtime_rate: Number(e.target.value) }))}
                                                />
                                            </div>
                                        </div>
                                        <Button onClick={handleSaveFinancials} disabled={isSavingFinance} className="w-full mt-2">
                                            {isSavingFinance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Rates
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-base">Recurring Deductions</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 mb-4">
                                            {financials.deductions.map((d, i) => (
                                                <div key={i} className="flex justify-between items-center p-2 rounded border bg-slate-50 text-sm">
                                                    <span>{d.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-semibold text-red-600">-${d.amount.toFixed(2)}</span>
                                                        <button onClick={() => removeDeduction(i)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {financials.deductions.length === 0 && <p className="text-xs text-muted-foreground italic">No deductions set.</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input placeholder="Description" value={newDeduction.name} onChange={e => setNewDeduction(p => ({ ...p, name: e.target.value }))} className="text-xs h-8" />
                                            <Input type="number" placeholder="Amount" value={newDeduction.amount} onChange={e => setNewDeduction(p => ({ ...p, amount: e.target.value }))} className="text-xs h-8" />
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={addDeduction} className="w-full mt-2 h-8 text-xs">Add Deduction</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Re-attach the cert modal here since it's needed for the profile view */}
                <Dialog open={isAddCertOpen} onOpenChange={setIsAddCertOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader><DialogTitle>Add License</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            {/* ... cert form ... */}
                            <div className="space-y-1">
                                <Label>License Name</Label>
                                <Input value={newCert.name} onChange={(e) => setNewCert(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>License Number</Label>
                                <Input value={newCert.number} onChange={(e) => setNewCert(p => ({ ...p, number: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Expiration Date</Label>
                                <Input type="date" value={newCert.expiry_date} onChange={(e) => setNewCert(p => ({ ...p, expiry_date: e.target.value }))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddCertOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddCertification}>Add License</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // --- STANDARD LIST VIEW ---
    return (
        <div className="space-y-4">
            {/* Search & Header */}
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search officers..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg p-1">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                        <UserPlus className="h-4 w-4" /> Add Officer
                    </Button>
                </div>
            </div>

            {isLoadingOfficers ? (
                <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {currentOfficers.map((officer) => (
                                <Card key={officer.id} className="overflow-hidden group hover:shadow-md transition-all hover:scale-[1.01] duration-200 cursor-pointer" onClick={() => setSelectedOfficer(officer)}>
                                    <div className="bg-muted/50 p-4 flex items-center gap-4 border-b">
                                        <Avatar fallback={officer.full_name.charAt(0)} className="h-12 w-12" />
                                        <div>
                                            <h3 className="font-semibold">{officer.full_name}</h3>
                                            <p className="text-xs text-muted-foreground">{officer.email}</p>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs">Badge #</p>
                                                <p className="font-medium">{officer.badge_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Phone</p>
                                                <p className="font-medium">{officer.phone}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {officer.certifications?.some(c => getCertStatusColor(c) === 'destructive') ? (
                                                <Badge variant="destructive" className="text-[10px] gap-1 px-1.5"><AlertCircle className="h-3 w-3" /> License Expired</Badge>
                                            ) : officer.certifications?.some(c => getCertStatusColor(c) === 'warning') ? (
                                                <Badge variant="warning" className="text-[10px] gap-1 px-1.5"><AlertCircle className="h-3 w-3" /> License Expiring</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 text-green-600 bg-green-50 border-green-200"><Shield className="h-3 w-3" /> Compliant</Badge>
                                            )}
                                        </div>

                                        <div className="pt-2 flex items-center justify-between border-t mt-2">
                                            <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                                                <Shield className="h-3 w-3" />
                                                {officer.employment_status.toUpperCase()}
                                            </span>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs">View Profile</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        // List view implementation (unchanged logic, just re-rendered)
                        <div className="rounded-lg border bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Officer</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Badge #</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {currentOfficers.map(officer => (
                                            <tr key={officer.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedOfficer(officer)}>
                                                <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar fallback={officer.full_name.charAt(0)} className="h-8 w-8" />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{officer.full_name}</span>
                                                            <span className="text-xs text-muted-foreground">{officer.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle font-mono">{officer.badge_number}</td>
                                                <td className="p-4 align-middle">
                                                    <Badge variant={officer.employment_status === 'active' ? 'success' : 'secondary'} className="capitalize">
                                                        {officer.employment_status}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <Button variant="ghost" size="sm">View</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Pagination Footer */}
            {filteredOfficers.length > 0 && (
                <div className="flex items-center justify-between py-4 border-t mt-4">
                    <p className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages} ({filteredOfficers.length} officers)
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>Previous</Button>
                        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                </div>
            )}

            {/* ADD OFFICER SHEET (Replaced Dialog) */}
            <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Onboard New Officer</SheetTitle>
                    </SheetHeader>
                    <div className="py-6 space-y-6">
                        <div className="space-y-1">
                            <Label>First & Last Name</Label>
                            <Input value={newOfficer.full_name} onChange={(e) => setNewOfficer(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. James Godonu" />
                        </div>
                        <div className="space-y-1">
                            <Label>Badge Number</Label>
                            <Input value={newOfficer.badge_number} onChange={(e) => setNewOfficer(p => ({ ...p, badge_number: e.target.value }))} placeholder="e.g. S-4501" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input value={newOfficer.email} onChange={(e) => setNewOfficer(p => ({ ...p, email: e.target.value }))} placeholder="email@company.com" />
                            </div>
                            <div className="space-y-1">
                                <Label>Phone</Label>
                                <Input value={newOfficer.phone} onChange={(e) => setNewOfficer(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 000-0000" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Skills (comma separated)</Label>
                            <Input value={newOfficer.skills} onChange={(e) => setNewOfficer(p => ({ ...p, skills: e.target.value }))} placeholder="armed, cpr, k9" />
                        </div>
                        <div className="space-y-1">
                            <Label>Employment Status</Label>
                            <select
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={newOfficer.employment_status}
                                onChange={(e) => setNewOfficer(p => ({ ...p, employment_status: e.target.value as any }))}
                            >
                                <option value="active">Active</option>
                                <option value="onboarding">Onboarding</option>
                                <option value="terminated">Terminated</option>
                            </select>
                        </div>
                    </div>
                    <SheetFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddOfficer} disabled={createOfficerMutation.isPending}>
                            {createOfficerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Complete Onboarding
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
