
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Tabs, TabsList, TabsTrigger, TabsContent, Avatar, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label } from '../components/ui';
import { db } from '../lib/db';
import { Client, Site, Invoice, Shift, Incident } from '../lib/types';
import { Building2, MapPin, Search, Plus, ExternalLink, ArrowLeft, Phone, Mail, Globe, TrendingUp, AlertTriangle, FileText, Clock, ShieldCheck, Calendar, DollarSign, CheckCircle2, Loader2, Briefcase, User, Save, Activity, Siren, FileCheck, History, Lock, UserPlus, LayoutGrid, List, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface ClientWithSites extends Client {
    sites: Site[];
}

export default function Clients() {
    const queryClient = useQueryClient();
    const { createClientUser, profile, organization } = useAuth();
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', contact_name: '', email: '', address: '', status: 'active' as const });

    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
    const [newSite, setNewSite] = useState({ name: '', address: '', risk_level: 'low' as const });

    // Edit Client State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editClientData, setEditClientData] = useState<Partial<Client>>({});

    // Delete Client State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', name: '', password: '' });

    // Selection State
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Rate Editing
    const [billingRates, setBillingRates] = useState({ standard: 45, holiday: 70, emergency: 85 });

    // --- QUERIES ---
    const { data: clients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ['clients', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.clients.select(organization.id);
            return data || [];
        }
    });

    const { data: sites = [], isLoading: isLoadingSites } = useQuery({
        queryKey: ['sites', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.sites.select(organization.id);
            return data || [];
        }
    });

    const clientsWithSites: ClientWithSites[] = useMemo(() => {
        return clients.map(client => ({
            ...client,
            sites: sites.filter(s => s.client_id === client.id)
        }));
    }, [clients, sites]);

    // Derived selected client
    const selectedClient = useMemo(() =>
        clientsWithSites.find(c => c.id === selectedClientId) || null
        , [clientsWithSites, selectedClientId]);

    // Fetch Details for Selected Client (Dependent Query)
    const { data: clientDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['clientDetails', selectedClientId, organization?.id],
        enabled: !!selectedClientId && !!organization,
        queryFn: async () => {
            if (!selectedClientId || !organization) return null;
            const [invRes, shiftRes, incRes, usersRes] = await Promise.all([
                db.getFullInvoices(organization.id),
                db.getFullSchedule(organization.id),
                db.getFullIncidents(organization.id),
                db.users.getByClient(selectedClientId)
            ]);

            // Filter Data
            const clientInvoices = (invRes.data || []).filter((i: any) => i.client_id === selectedClientId);
            const clientShifts = (shiftRes.data || []).filter((s: any) => s.site?.client_id === selectedClientId);
            const clientIncidents = (incRes.data || []).filter((i: any) => i.site?.client_id === selectedClientId);

            // Calc Stats
            const totalSpend = clientInvoices.reduce((acc: number, curr: any) => acc + (curr.status !== 'draft' ? curr.amount : 0), 0);
            const outstandingBalance = clientInvoices
                .filter((i: any) => i.status === 'sent' || i.status === 'overdue')
                .reduce((acc: number, curr: any) => acc + curr.amount, 0);

            // Sort Shifts by date desc
            clientShifts.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

            return {
                invoices: clientInvoices,
                shifts: clientShifts,
                incidents: clientIncidents,
                users: usersRes.data || [],
                stats: {
                    totalSpend,
                    outstandingBalance,
                    openIncidents: clientIncidents.filter((i: any) => i.status !== 'closed').length,
                    shiftCount: clientShifts.length
                }
            };
        }
    });

    // Default detail structure
    const details = clientDetails || {
        invoices: [],
        shifts: [],
        incidents: [],
        users: [],
        stats: { totalSpend: 0, outstandingBalance: 0, openIncidents: 0, shiftCount: 0 }
    };

    // Derived Analytics for 360 View
    const recentActivity = useMemo(() => {
        if (!clientDetails) return [];
        const shifts = (clientDetails.shifts || []).map((s: any) => ({ ...s, activityType: 'shift', date: s.start_time }));
        const incidents = (clientDetails.incidents || []).map((i: any) => ({ ...i, activityType: 'incident', date: i.reported_at }));
        const invoices = (clientDetails.invoices || []).map((i: any) => ({ ...i, activityType: 'invoice', date: i.issue_date }));

        return [...shifts, ...incidents, ...invoices]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [clientDetails]);

    const spendBySite = useMemo(() => {
        if (!clientDetails || !clientDetails.shifts) return [];
        const map = new Map<string, number>();
        clientDetails.shifts.forEach((s: any) => {
            const siteName = s.site?.name || 'Unassigned Site';
            const start = new Date(s.start_time).getTime();
            const end = new Date(s.end_time).getTime();
            const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
            // Estimate cost
            const rate = s.bill_rate || selectedClient?.billing_settings?.standard_rate || 45;
            const cost = hours * rate;
            map.set(siteName, (map.get(siteName) || 0) + cost);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [clientDetails, selectedClient]);

    // --- MUTATIONS ---
    const createClientMutation = useMutation({
        mutationFn: async (clientData: any) => {
            const { data, error } = await db.clients.create(clientData);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });

            // Audit Log
            db.audit_logs.create({
                action: 'create',
                description: `Created new client: ${data.name}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Client',
                target_id: data.id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsAddOpen(false);
            setNewClient({ name: '', contact_name: '', email: '', address: '', status: 'active' });
        }
    });

    const createSiteMutation = useMutation({
        mutationFn: async (siteData: any) => {
            const { data, error } = await db.sites.create(siteData);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sites'] });

            // Audit Log
            db.audit_logs.create({
                action: 'create',
                description: `Added new site: ${data.name}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Site',
                target_id: data.id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsAddSiteOpen(false);
            setNewSite({ name: '', address: '', risk_level: 'low' });
        }
    });

    const updateClientMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Client> }) => {
            await db.clients.update(id, data);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });

            // Audit Log
            db.audit_logs.create({
                action: 'update',
                description: `Updated client details.`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Client',
                target_id: variables.id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsEditOpen(false);
            // Update selected client view if it's the one edited (though query invalidation should handle it, explicit set helps flicker)
            // But since selectedClient is derived from clientsWithSites which comes from query, invalidation is enough.
        }
    });

    const deleteClientMutation = useMutation({
        mutationFn: async (id: string) => {
            await db.clients.delete(id);
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });

            // Audit Log
            db.audit_logs.create({
                action: 'delete',
                description: `Deleted client: ${clientsWithSites.find(c => c.id === id)?.name || id}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Client',
                target_id: id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsDeleteConfirmOpen(false);
            setSelectedClientId(null); // Return to directory
        }
    });

    const createUserMutation = useMutation({
        mutationFn: async () => {
            if (!selectedClientId) return;
            await createClientUser(newUser.email, newUser.password, newUser.name, selectedClientId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientDetails'] });

            // Audit Log
            db.audit_logs.create({
                action: 'create',
                description: `Created new client user: ${newUser.name}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'User',
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsAddUserOpen(false);
            setNewUser({ email: '', name: '', password: '' });
            alert("User created successfully. They can login with the temporary password.");
        },
        onError: (err: any) => {
            alert("Failed to create user: " + err.message);
        }
    });

    // --- HANDLERS ---
    const handleAddClient = () => {
        if (!newClient.name) return;
        createClientMutation.mutate({ ...newClient, organization_id: organization?.id });
    };

    const handleAddSite = () => {
        if (!selectedClientId) return;
        if (!newSite.name) return;

        const siteData = {
            ...newSite,
            organization_id: organization?.id,
            client_id: selectedClientId,
            lat: 34.0522, // Default to LA for demo
            lng: -118.2437,
            radius: 200
        };
        createSiteMutation.mutate(siteData);
    };

    const handleViewClient = (client: ClientWithSites) => {
        setSelectedClientId(client.id);

        // Init local rate state
        setBillingRates({
            standard: client.billing_settings?.standard_rate || 45,
            holiday: client.billing_settings?.holiday_rate || 70,
            emergency: client.billing_settings?.emergency_rate || 85
        });
    };

    const handleSaveRates = () => {
        if (!selectedClientId) return;
        updateClientMutation.mutate({
            id: selectedClientId,
            data: {
                billing_settings: {
                    standard_rate: billingRates.standard,
                    holiday_rate: billingRates.holiday,
                    emergency_rate: billingRates.emergency
                }
            }
        });
    };

    const filteredData = clientsWithSites.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.contact_name.toLowerCase().includes(filter.toLowerCase()));
    const isLoading = isLoadingClients || isLoadingSites;

    // --- CLIENT 360 VIEW ---
    if (selectedClient) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                {/* HEADER SECTION */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedClientId(null)} className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" /> Back to Directory
                        </Button>
                    </div>

                    <Card className="bg-slate-900 text-slate-50 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-lg bg-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-900/50">
                                        {selectedClient.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight">{selectedClient.name}</h1>
                                        <div className="flex items-center gap-3 mt-1 text-slate-300 text-sm">
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedClient.address}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-500"></span>
                                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedClient.contact_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={selectedClient.status === 'active' ? 'success' : 'secondary'} className="px-3 py-1 text-sm uppercase tracking-wide">
                                        {selectedClient.status}
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        className="bg-transparent border-slate-600 text-slate-100 hover:bg-slate-800 hover:text-white"
                                        onClick={() => {
                                            setEditClientData({
                                                name: selectedClient.name,
                                                contact_name: selectedClient.contact_name,
                                                email: selectedClient.email,
                                                address: selectedClient.address,
                                                status: selectedClient.status
                                            });
                                            setIsEditOpen(true);
                                        }}
                                    >
                                        Edit Profile
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="bg-transparent border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-300 hover:border-red-900"
                                        onClick={() => setIsDeleteConfirmOpen(true)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* QUICK STATS ROW */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Building2 className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Active Sites</p>
                                    <p className="text-xl font-bold">{selectedClient.sites.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-green-100 text-green-700 rounded-lg"><DollarSign className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Total Spend</p>
                                    <p className="text-xl font-bold">${details.stats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Clock className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Total Shifts</p>
                                    <p className="text-xl font-bold">{details.stats.shiftCount}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-red-100 text-red-700 rounded-lg"><AlertTriangle className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Open Incidents</p>
                                    <p className="text-xl font-bold">{details.stats.openIncidents}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* EDIT CLIENT DIALOG */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Client Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Client Name</Label>
                                <Input
                                    value={editClientData.name || ''}
                                    onChange={(e) => setEditClientData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact Person</Label>
                                <Input
                                    value={editClientData.contact_name || ''}
                                    onChange={(e) => setEditClientData(prev => ({ ...prev, contact_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    value={editClientData.email || ''}
                                    onChange={(e) => setEditClientData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input
                                    value={editClientData.address || ''}
                                    onChange={(e) => setEditClientData(prev => ({ ...prev, address: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={editClientData.status || 'active'}
                                    onChange={(e) => setEditClientData(prev => ({ ...prev, status: e.target.value as any }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button onClick={() => selectedClient && updateClientMutation.mutate({ id: selectedClient.id, data: editClientData })}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* DELETE CONFIRM DIALOG */}
                <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Client</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-center space-y-2">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-red-100 rounded-full animate-bounce">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                            <p className="font-semibold text-lg">{selectedClient.name}</p>
                            <p className="text-muted-foreground text-sm">
                                Are you sure you want to delete this client? This action cannot be undone.
                            </p>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 text-left mt-4">
                                <strong>Warning:</strong> Deleting a client will not automatically delete their sites or history.
                                Ensure you have archived necessary data.
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={() => selectedClient && deleteClientMutation.mutate(selectedClient.id)}
                            >
                                Delete Permanently
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 360 VIEW TABS */}
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="bg-white border p-1 h-auto gap-2">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 h-9">Overview</TabsTrigger>
                        <TabsTrigger value="operations" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 h-9">Operations</TabsTrigger>
                        <TabsTrigger value="financials" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 h-9">Financials</TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 h-9">Users</TabsTrigger>
                    </TabsList>

                    {/* 1. OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Left Column: Contact & Contract */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-full"><User className="h-4 w-4 text-slate-600" /></div>
                                            <div><p className="text-xs text-muted-foreground">Primary Contact</p><p className="font-medium text-sm">{selectedClient.contact_name}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-full"><Mail className="h-4 w-4 text-slate-600" /></div>
                                            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-sm">{selectedClient.email}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-full"><Phone className="h-4 w-4 text-slate-600" /></div>
                                            <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-sm">(555) 123-4567</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-full"><MapPin className="h-4 w-4 text-slate-600" /></div>
                                            <div><p className="text-xs text-muted-foreground">HQ Address</p><p className="font-medium text-sm">{selectedClient.address}</p></div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Contract Details */}
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            <Badge variant="outline" className="capitalize">{selectedClient.status}</Badge>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Start Date</span>
                                            <span className="text-sm font-medium">Jan 01, 2023</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Renewal Date</span>
                                            <span className="text-sm font-medium">Jan 01, 2025</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Payment Terms</span>
                                            <span className="text-sm font-medium">Net 30</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">SLA Level</span>
                                            <span className="text-sm font-medium text-blue-600">Enterprise Gold</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Sites & Activity Feed */}
                            <div className="md:col-span-2 space-y-6">
                                {/* Sites Management */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-base">Site Locations</CardTitle>
                                        <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setIsAddSiteOpen(true)}>
                                            <Plus className="h-3 w-3" /> Add Site
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y max-h-[250px] overflow-y-auto">
                                            {selectedClient.sites.length === 0 && <p className="p-6 text-muted-foreground text-sm">No sites configured.</p>}
                                            {selectedClient.sites.map(site => (
                                                <div key={site.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1"><MapPin className="h-4 w-4 text-blue-500" /></div>
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900">{site.name}</p>
                                                            <p className="text-xs text-muted-foreground">{site.address}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">{site.radius}m Geofence</span>
                                                        <Badge variant={site.risk_level === 'high' ? 'destructive' : site.risk_level === 'medium' ? 'warning' : 'outline'} className="capitalize">
                                                            {site.risk_level} Risk
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Recent Activity Feed */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Recent Activity</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y max-h-[400px] overflow-y-auto">
                                            {recentActivity.length === 0 && <p className="p-6 text-muted-foreground text-sm">No recent activity.</p>}
                                            {recentActivity.map((item: any, i) => (
                                                <div key={i} className="p-4 flex gap-3 text-sm hover:bg-slate-50 transition-colors">
                                                    <div className="mt-0.5 shrink-0">
                                                        {item.activityType === 'shift' && <Calendar className="h-4 w-4 text-blue-500" />}
                                                        {item.activityType === 'incident' && <Siren className="h-4 w-4 text-red-500" />}
                                                        {item.activityType === 'invoice' && <FileCheck className="h-4 w-4 text-green-500" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <p className="font-medium text-slate-900">
                                                                {item.activityType === 'shift' && `Shift at ${item.site?.name || 'Site'}`}
                                                                {item.activityType === 'incident' && `${item.type} Incident Reported`}
                                                                {item.activityType === 'invoice' && `Invoice Generated #${item.invoice_number}`}
                                                            </p>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                                {new Date(item.date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {item.activityType === 'shift' && `Officer: ${item.officer?.full_name || 'Unassigned'}`}
                                                            {item.activityType === 'incident' && `Severity: ${item.severity} • Status: ${item.status}`}
                                                            {item.activityType === 'invoice' && `Amount: $${item.amount.toLocaleString()} • Status: ${item.status}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* 2. OPERATIONS TAB (SHIFTS) */}
                    <TabsContent value="operations">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Shift History</CardTitle>
                                <Badge variant="outline">{details.shifts.length} Total Records</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoadingDetails ? (
                                    <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                ) : (
                                    <div className="divide-y">
                                        {details.shifts.length === 0 && <p className="p-6 text-muted-foreground text-sm">No shift history found.</p>}
                                        {details.shifts.slice(0, 10).map((shift: any) => (
                                            <div key={shift.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-slate-100 rounded-md">
                                                        <Calendar className="h-4 w-4 text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{new Date(shift.start_time).toLocaleDateString()} <span className="text-muted-foreground font-normal">at {shift.site?.name}</span></p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                            <span>{new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {shift.officer?.full_name || 'Unassigned'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant={shift.status === 'completed' ? 'success' : shift.status === 'assigned' ? 'default' : 'secondary'} className="capitalize">
                                                    {shift.status}
                                                </Badge>
                                            </div>
                                        ))}
                                        {details.shifts.length > 10 && (
                                            <div className="p-3 text-center border-t bg-slate-50">
                                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">View All Shift History</Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 3. FINANCIALS TAB */}
                    <TabsContent value="financials">
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                            <Card>
                                <CardContent className="p-4 pt-6 text-center">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Outstanding Balance</p>
                                    <p className={`text-2xl font-bold mt-2 ${details.stats.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ${details.stats.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 pt-6 text-center">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Billed (Lifetime)</p>
                                    <p className="text-2xl font-bold mt-2 text-slate-900">
                                        ${details.stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 pt-6 text-center">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Payment Terms</p>
                                    <p className="text-xl font-semibold mt-2 text-slate-700">Net 30</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                {/* SPEND BY SITE ANALYSIS */}
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Spend by Site (Est.)</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {spendBySite.map((item, i) => (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium">{item.name}</span>
                                                        <span>${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${Math.min(100, (item.value / (spendBySite[0]?.value || 1)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                            {spendBySite.length === 0 && <p className="text-sm text-muted-foreground">No shift data available for estimation.</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-base">Invoice History</CardTitle></CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y">
                                            {details.invoices.length === 0 && <p className="p-6 text-muted-foreground text-sm">No invoices found.</p>}
                                            {details.invoices.map((inv: any) => (
                                                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-slate-100 rounded-md">
                                                            <FileText className="h-4 w-4 text-slate-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900">{inv.invoice_number}</p>
                                                            <p className="text-xs text-muted-foreground">Issued: {new Date(inv.issue_date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <span className="font-bold text-sm">${inv.amount.toLocaleString()}</span>
                                                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize text-[10px] h-5 px-1.5">
                                                            {inv.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div>
                                <Card className="h-full">
                                    <CardHeader><CardTitle className="text-base">Rate Card</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Standard Rate ($/hr)</Label>
                                            <Input
                                                type="number"
                                                value={billingRates.standard}
                                                onChange={(e) => setBillingRates(p => ({ ...p, standard: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Holiday Rate ($/hr)</Label>
                                            <Input
                                                type="number"
                                                value={billingRates.holiday}
                                                onChange={(e) => setBillingRates(p => ({ ...p, holiday: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Emergency Rate ($/hr)</Label>
                                            <Input
                                                type="number"
                                                value={billingRates.emergency}
                                                onChange={(e) => setBillingRates(p => ({ ...p, emergency: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <Button className="w-full mt-4" onClick={handleSaveRates} disabled={updateClientMutation.isPending}>
                                            {updateClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Save className="mr-2 h-4 w-4" /> Save Rates
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* 4. USERS TAB */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-base">Client User Accounts</CardTitle>
                                    <p className="text-sm text-muted-foreground">Manage access for this client.</p>
                                </div>
                                <Button size="sm" className="gap-2" onClick={() => setIsAddUserOpen(true)}>
                                    <UserPlus className="h-4 w-4" /> Add User
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {details.users.length === 0 && <p className="p-6 text-muted-foreground text-sm">No users found for this client.</p>}
                                    {details.users.map((user: any) => (
                                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <Avatar fallback={user.full_name[0]} className="h-9 w-9 bg-slate-200" />
                                                <div>
                                                    <p className="text-sm font-medium">{user.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                            <div>
                                                {user.is_temporary_password && (
                                                    <Badge variant="warning" className="text-[10px]">Temp Password</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ADD SITE DIALOG (Scoped to Client View) */}
                <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
                    <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
                        <DialogHeader className="px-6 py-6 border-b">
                            <DialogTitle className="text-xl">Add New Site Location</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <Label>Site Name</Label>
                                <Input value={newSite.name} onChange={e => setNewSite(p => ({ ...p, name: e.target.value }))} placeholder="e.g. North Warehouse" />
                            </div>
                            <div className="space-y-1">
                                <Label>Full Address</Label>
                                <Input value={newSite.address} onChange={e => setNewSite(p => ({ ...p, address: e.target.value }))} placeholder="123 Industrial Rd" />
                            </div>
                            <div className="space-y-1">
                                <Label>Risk Level</Label>
                                <select
                                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                    value={newSite.risk_level}
                                    onChange={(e) => setNewSite(p => ({ ...p, risk_level: e.target.value as any }))}
                                >
                                    <option value="low">Low Risk</option>
                                    <option value="medium">Medium Risk</option>
                                    <option value="high">High Risk</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
                            <Button variant="outline" onClick={() => setIsAddSiteOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddSite} disabled={createSiteMutation.isPending}>
                                {createSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Location
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ADD USER DIALOG */}
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>Create Client User</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-100 flex gap-2">
                                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>User will be required to change their password upon first login.</span>
                            </div>
                            <div className="space-y-1">
                                <Label>Full Name</Label>
                                <Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
                            </div>
                            <div className="space-y-1">
                                <Label>Email Address</Label>
                                <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" />
                            </div>
                            <div className="space-y-1">
                                <Label>Temporary Password</Label>
                                <Input type="text" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="e.g. Temp1234" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                            <Button onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending}>
                                {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // --- STANDARD LIST VIEW ---
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Clients & Sites</h2>
                    <p className="text-sm text-muted-foreground">Manage client contracts and site locations.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search clients..." className="pl-8" value={filter} onChange={(e) => setFilter(e.target.value)} />
                    </div>

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

                    <Button className="gap-2" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4" /> Add Client</Button>
                </div>
            </div>

            {isLoading && <div className="text-center py-8 text-muted-foreground">Loading clients...</div>}

            {viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {filteredData.map(client => (
                        <Card key={client.id} className="flex flex-col group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewClient(client)}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 px-4 pt-4 bg-muted/30 border-b">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
                                        <Building2 className="h-4 w-4" />
                                        {client.name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{client.address}</p>
                                </div>
                                <Badge className="text-[10px] h-5 px-1.5" variant={client.status === 'active' ? 'success' : 'secondary'}>{client.status}</Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-3 flex-1">
                                <div className="text-xs space-y-1 mb-3">
                                    <p><span className="text-muted-foreground">Contact:</span> {client.contact_name}</p>
                                    <p><span className="text-muted-foreground">Email:</span> {client.email}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Locations ({client.sites.length})</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {client.sites.slice(0, 3).map(site => (
                                            <Badge key={site.id} variant="outline" className="text-[10px] px-1.5 h-5 flex items-center gap-1">
                                                <MapPin className="h-2.5 w-2.5" /> {site.name}
                                            </Badge>
                                        ))}
                                        {client.sites.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5 h-5">+{client.sites.length - 3}</Badge>}
                                        {client.sites.length === 0 && <span className="text-[10px] text-muted-foreground italic">No sites</span>}
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t flex justify-end">
                                    <span className="text-[10px] font-medium text-primary flex items-center gap-1">View 360° <ArrowLeft className="h-2.5 w-2.5 rotate-180" /></span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="rounded-lg border bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Client</th>
                                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Contact</th>
                                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Sites</th>
                                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredData.map(client => (
                                    <tr key={client.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewClient(client)}>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                    {client.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{client.name}</span>
                                                    <span className="text-xs text-muted-foreground">{client.address}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{client.contact_name}</span>
                                                <span className="text-xs text-muted-foreground">{client.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>{client.status}</Badge>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-wrap gap-1">
                                                {client.sites.slice(0, 2).map(site => (
                                                    <Badge key={site.id} variant="outline" className="text-[10px] h-5">{site.name}</Badge>
                                                ))}
                                                {client.sites.length > 2 && <span className="text-xs text-muted-foreground">+{client.sites.length - 2} more</span>}
                                                {client.sites.length === 0 && <span className="text-xs text-muted-foreground italic">No sites</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewClient(client); }}>View 360°</Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No clients found matching your search.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD CLIENT MODAL */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-6 border-b">
                        <DialogTitle className="text-xl">Add New Client</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-6">
                        <div className="space-y-1">
                            <Label>Company Name</Label>
                            <Input value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Acme Corp" />
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-4 border-b pb-2 mt-2">Point of Contact</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Contact Name</Label>
                                    <Input value={newClient.contact_name} onChange={e => setNewClient(p => ({ ...p, contact_name: e.target.value }))} placeholder="Jane Doe" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email Address</Label>
                                    <Input value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="jane@acme.com" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Billing Address</Label>
                            <Input value={newClient.address} onChange={e => setNewClient(p => ({ ...p, address: e.target.value }))} placeholder="123 Corporate Blvd" />
                        </div>

                        <div className="space-y-1">
                            <Label>Account Status</Label>
                            <select
                                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                value={newClient.status}
                                onChange={(e) => setNewClient(p => ({ ...p, status: e.target.value as any }))}
                            >
                                <option value="active">Active</option>
                                <option value="prospect">Prospect</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddClient} disabled={createClientMutation.isPending}>
                            {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Client
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
