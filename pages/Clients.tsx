
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Tabs, TabsList, TabsTrigger, TabsContent, Avatar, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label, cn } from '../components/ui';
import { PressButton, Shimmer, AnimatedNumber, SuccessToast, StaggerContainer, useSuccessFeedback, useConfetti } from '../components/MicroAnimations';
import { db } from '../lib/db';
import { Client, Site, Invoice, Shift, Incident } from '../lib/types';
import { Building2, MapPin, Search, Plus, ExternalLink, ArrowLeft, Phone, Mail, Globe, TrendingUp, AlertTriangle, FileText, Clock, ShieldCheck, Calendar, DollarSign, CheckCircle2, Loader2, Briefcase, User as UserIcon, Save, Activity, Siren, FileCheck, History, Lock, UserPlus, LayoutGrid, List, Trash2, Key, Pencil, Inbox, Minimize2, Maximize2, Sparkles, ChevronDown, ChevronRight, Users, RefreshCw, Filter, Zap, X, ArrowUpRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { StepIndicator } from '../components/StepIndicator';
import { QuickFilterChips } from '../components/QuickFilterChips';

interface ClientWithSites extends Client {
    sites: Site[];
}

export default function Clients() {
    const queryClient = useQueryClient();
    const { createClientUser, profile, organization } = useAuth();
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newClientStep, setNewClientStep] = useState(0);
    const [showClientStepErrors, setShowClientStepErrors] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', contact_name: '', email: '', address: '', status: 'active' as const });

    const clientCreationSteps = [
        { id: 'company', label: 'Company Info', description: 'Basic company details' },
        { id: 'contact', label: 'Contact Person', description: 'Primary point of contact' },
        { id: 'billing', label: 'Billing Setup', description: 'Address and contract terms' },
        { id: 'review', label: 'Review', description: 'Confirm and create account' }
    ];

    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
    const [newSite, setNewSite] = useState({ name: '', address: '', risk_level: 'low' as const });

    const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
    const [editSiteData, setEditSiteData] = useState<Partial<Site>>({});
    const [isDeleteSiteConfirmOpen, setIsDeleteSiteConfirmOpen] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

    // Edit Client State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editClientData, setEditClientData] = useState<Partial<Client>>({});

    // Delete Client State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', name: '', password: '' });

    // Selection State
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [siteSearch, setSiteSearch] = useState('');
    const [siteRiskFilter, setSiteRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
    const [sitePanelView, setSitePanelView] = useState<'list' | 'grid'>('list');
    const [clientSectionOpen, setClientSectionOpen] = useState({ contact: true, contract: true, sites: true, activity: true });

    // Rate Editing
    const [billingRates, setBillingRates] = useState({ standard: 45, holiday: 70, emergency: 85 });

    // Micro-animation hooks
    const { showFeedback, SuccessComponent } = useSuccessFeedback();
    const { celebrate, ConfettiComponent } = useConfetti();

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

    const directoryStats = useMemo(() => ({
        total: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        prospect: clients.filter(c => c.status === 'prospect').length,
        terminated: clients.filter(c => c.status === 'terminated').length,
        sites: sites.length,
    }), [clients, sites]);

    function StatPill({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
        return (
            <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-4 py-3 min-w-0 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
                <div className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', accent ?? 'text-muted-foreground')}>
                    <Icon className="h-3 w-3 shrink-0" />{label}
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums leading-none mt-1 tracking-tight">{value}</p>
            </div>
        );
    }

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

    const filteredSelectedSites = useMemo(() => {
        if (!selectedClient) return [] as Site[];
        const q = siteSearch.trim().toLowerCase();
        return selectedClient.sites.filter((site) => {
            if (siteRiskFilter !== 'all' && site.risk_level !== siteRiskFilter) return false;
            if (!q) return true;
            return (`${site.name} ${site.address}`.toLowerCase().includes(q));
        });
    }, [selectedClient, siteSearch, siteRiskFilter]);

    // --- MUTATIONS ---
    const createClientMutation = useMutation({
        mutationFn: async (clientData: any) => {
            const { data, error } = await db.clients.create(clientData);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            // Show success toast & confetti
            showFeedback('Client created successfully!');
            celebrate();

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

    const updateSiteMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Site> }) => {
            await db.sites.update(id, data);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sites'] });

            db.audit_logs.create({
                action: 'update',
                description: `Updated site: ${variables.data.name || variables.id}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Site',
                target_id: variables.id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsEditSiteOpen(false);
            setEditSiteData({});
            setSelectedSiteId(null);
        }
    });

    const deleteSiteMutation = useMutation({
        mutationFn: async (id: string) => {
            await db.sites.delete(id);
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ['sites'] });

            db.audit_logs.create({
                action: 'delete',
                description: `Deleted site ID: ${id}`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'Site',
                target_id: id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsDeleteSiteConfirmOpen(false);
            setSelectedSiteId(null);
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
            // Refresh UI feedback
            showFeedback('Client updated');
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
            showFeedback('Client deleted');
            setSelectedClientId(null); // Return to directory
        }
    });

    const createUserMutation = useMutation({
        mutationFn: async () => {
            if (!selectedClientId) throw new Error("No client selected");

            // Domain Validation
            if (organization?.white_label?.custom_domain || organization?.name) {
                const currentUserEmail = profile?.email || '';
                const orgDomain = currentUserEmail.split('@')[1];
                const newEmailDomain = newUser.email.split('@')[1];

                if (orgDomain && newEmailDomain !== orgDomain) {
                    throw new Error(`Security Requirement: Client user emails must match the organization domain (@${orgDomain}).`);
                }
            }

            const newUserId = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            await db.users.create({
                id: newUserId,
                email: newUser.email,
                full_name: newUser.name,
                role: 'client',
                organization_id: organization?.id || '',
                client_id: selectedClientId,
                is_temporary_password: true
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientDetails'] });

            // Audit Log
            db.audit_logs.create({
                action: 'create',
                description: `Created new client user: ${newUser.name} (${newUser.email})`,
                performed_by: profile?.full_name || 'System',
                performed_by_id: profile?.id || 'system',
                target_resource: 'User',
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });

            setIsAddUserOpen(false);
            setNewUser({ email: '', name: '', password: '' });
            // alert("User created successfully.");
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

    const filteredData = useMemo(() => {
        return clientsWithSites.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) || c.contact_name.toLowerCase().includes(filter.toLowerCase());
            if (activeFilters.length === 0) return matchesSearch;
            return matchesSearch && activeFilters.includes(c.status);
        });
    }, [clientsWithSites, filter, activeFilters]);
    const isLoading = isLoadingClients || isLoadingSites;
    const isCompact = density === 'compact';
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email.trim());
    const clientStepErrors = {
        company: !newClient.name.trim(),
        contactName: !newClient.contact_name.trim(),
        emailRequired: !newClient.email.trim(),
        emailFormat: !!newClient.email.trim() && !emailLooksValid
    };

    const canProceedClientStep =
        (newClientStep === 0 && !clientStepErrors.company) ||
        (newClientStep === 1 && !clientStepErrors.contactName && !clientStepErrors.emailRequired && !clientStepErrors.emailFormat) ||
        newClientStep >= 2;

    const resetClientForm = () => {
        setNewClientStep(0);
        setShowClientStepErrors(false);
        setNewClient({ name: '', contact_name: '', email: '', address: '', status: 'active' });
    };

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

                    <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden relative">
                        <div className="p-6 relative">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm relative group/profile-img overflow-hidden transition-all duration-500 hover:scale-105">
                                        <Building2 className="h-8 w-8 transition-transform duration-500 group-hover/profile-img:rotate-12" />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover/profile-img:opacity-100 transition-opacity" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold tracking-tight text-foreground transition-all duration-300">{selectedClient.name}</h1>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground text-xs md:text-sm font-medium">
                                            <span className="flex items-center gap-1.5 opacity-80"><MapPin className="h-3.5 w-3.5 text-primary/70" />{selectedClient.address || 'Central Headquarters'}</span>
                                            <span className="flex items-center gap-1.5 opacity-80"><UserIcon className="h-3.5 w-3.5 text-primary/70" />{selectedClient.contact_name || 'Unassigned'}</span>
                                            <span className="flex items-center gap-1.5 opacity-80"><Mail className="h-3.5 w-3.5 text-primary/70" />{selectedClient.email || 'No email provided'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={cn('text-xs font-bold px-4 py-1.5 rounded-full border capitalize', selectedClient.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : selectedClient.status === 'prospect' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-red-500/10 text-red-600 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]')}>{selectedClient.status}</span>
                                    <Button variant="outline" onClick={() => { setEditClientData({ name: selectedClient.name, contact_name: selectedClient.contact_name, email: selectedClient.email, address: selectedClient.address, status: selectedClient.status }); setIsEditOpen(true); }} className="rounded-2xl">
                                        <Pencil className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => setIsDeleteConfirmOpen(true)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* QUICK STATS ROW */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-5 py-4 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
                                    <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sites</p>
                            </div>
                            <p className="text-2xl font-bold tabular-nums text-primary">{selectedClient.sites.length}</p>
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-5 py-4 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Spend</p>
                            </div>
                            <AnimatedNumber value={details.stats.totalSpend} prefix="$" className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-5 py-4 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-500/10">
                                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Shifts</p>
                            </div>
                            <AnimatedNumber value={details.stats.shiftCount} className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-5 py-4 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/10">
                                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open Incidents</p>
                            </div>
                            <AnimatedNumber value={details.stats.openIncidents} className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400" />
                        </div>
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

                {/* ADD USER DIALOG */}
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Client Portal User</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md flex items-start gap-2 border border-blue-100">
                                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <strong>Access Control:</strong> This user will have access to the Client Portal for {selectedClient.name}.
                                    Emails must match your organization's domain (@{profile?.email.split('@')[1] || '...'}) for security verification.
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    placeholder={`e.g. user@${profile?.email.split('@')[1] || 'company.com'}`}
                                    value={newUser.email}
                                    onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Temporary Password</Label>
                                <Input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))}
                                    placeholder="Leave blank to auto-generate"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                            <Button onClick={() => createUserMutation.mutate()}>Create User</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 360 VIEW TABS */}
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="bg-card border border-border p-1 h-auto gap-2">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-9">Overview</TabsTrigger>
                        <TabsTrigger value="operations" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-9">Operations</TabsTrigger>
                        <TabsTrigger value="financials" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-9">Financials</TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-9">Users</TabsTrigger>
                    </TabsList>


                    {/* 1. OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Left Column: Contact & Contract */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <button
                                            className="w-full flex items-center justify-between text-left"
                                            onClick={() => setClientSectionOpen(p => ({ ...p, contact: !p.contact }))}
                                        >
                                            <CardTitle className="text-base">Contact Information</CardTitle>
                                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", clientSectionOpen.contact && "rotate-180")} />
                                        </button>
                                    </CardHeader>
                                    {clientSectionOpen.contact && (
                                        <CardContent className="space-y-4 pt-0 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-full"><UserIcon className="h-4 w-4 text-slate-600" /></div>
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
                                    )}
                                </Card>

                                {/* Contract Details */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <button
                                            className="w-full flex items-center justify-between text-left"
                                            onClick={() => setClientSectionOpen(p => ({ ...p, contract: !p.contract }))}
                                        >
                                            <CardTitle className="text-base">Contract Details</CardTitle>
                                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", clientSectionOpen.contract && "rotate-180")} />
                                        </button>
                                    </CardHeader>
                                    {clientSectionOpen.contract && (
                                        <CardContent className="space-y-4 pt-0 animate-in fade-in duration-200">
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
                                    )}
                                </Card>
                            </div>

                            {/* Right Column: Sites & Activity Feed */}
                            <div className="md:col-span-2 space-y-6">
                                {/* Sites Management */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <button
                                                className="flex items-center gap-2"
                                                onClick={() => setClientSectionOpen(p => ({ ...p, sites: !p.sites }))}
                                            >
                                                <CardTitle className="text-base">Site Locations</CardTitle>
                                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", clientSectionOpen.sites && "rotate-180")} />
                                            </button>
                                            <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setIsAddSiteOpen(true)}>
                                                <Plus className="h-3 w-3" /> Add Site
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {clientSectionOpen.sites && (
                                        <CardContent className="pt-0 space-y-3 animate-in fade-in duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
                                                <Input value={siteSearch} onChange={(e) => setSiteSearch(e.target.value)} placeholder="Search site name or address" />
                                                <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={siteRiskFilter} onChange={(e) => setSiteRiskFilter(e.target.value as any)}>
                                                    <option value="all">All Risk</option>
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                </select>
                                                <Button variant={sitePanelView === 'list' ? 'secondary' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setSitePanelView('list')}><List className="h-3.5 w-3.5" /></Button>
                                                <Button variant={sitePanelView === 'grid' ? 'secondary' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setSitePanelView('grid')}><LayoutGrid className="h-3.5 w-3.5" /></Button>
                                            </div>

                                            {sitePanelView === 'list' ? (
                                                <div className="rounded-xl border border-border/60 overflow-hidden max-h-[280px] overflow-y-auto">
                                                    {filteredSelectedSites.length === 0 && <p className="p-6 text-muted-foreground text-sm text-center">No sites match this filter.</p>}
                                                    {filteredSelectedSites.map(site => {
                                                        const riskDot = site.risk_level === 'high' ? 'bg-red-500' : site.risk_level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
                                                        const riskBadge = site.risk_level === 'high' ? 'bg-red-500/10 text-red-600 border-red-500/20' : site.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                                                        return (
                                                            <div key={site.id} className="flex items-center justify-between p-3.5 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors group/site">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <span className={cn('h-2 w-2 rounded-full shrink-0', riskDot)} />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-foreground truncate">{site.name}</p>
                                                                        <p className="text-[11px] text-muted-foreground truncate">{site.address}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize', riskBadge)}>{site.risk_level}</span>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover/site:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditSiteData(site); setSelectedSiteId(site.id); setIsEditSiteOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => { setSelectedSiteId(site.id); setIsDeleteSiteConfirmOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {filteredSelectedSites.length === 0 && <p className="md:col-span-2 p-4 text-muted-foreground text-xs text-center border border-border rounded-md">No sites match this filter.</p>}
                                                    {filteredSelectedSites.map(site => (
                                                        <div key={site.id} className="rounded-lg border border-border p-2.5 bg-background/70 hover:bg-muted/20 transition-colors">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="font-semibold text-xs">{site.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{site.address}</p>
                                                                </div>
                                                                <Badge variant={site.risk_level === 'high' ? 'destructive' : site.risk_level === 'medium' ? 'warning' : 'outline'} className="capitalize h-4 text-[9px] px-1.5">{site.risk_level}</Badge>
                                                            </div>
                                                            <div className="flex justify-end gap-1 mt-2">
                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditSiteData(site); setSelectedSiteId(site.id); setIsEditSiteOpen(true); }}><Pencil className="h-3 w-3 text-blue-600" /></Button>
                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedSiteId(site.id); setIsDeleteSiteConfirmOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>

                                {/* Recent Activity Feed */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <button
                                            className="w-full flex items-center justify-between"
                                            onClick={() => setClientSectionOpen(p => ({ ...p, activity: !p.activity }))}
                                        >
                                            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Recent Activity</CardTitle>
                                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", clientSectionOpen.activity && "rotate-180")} />
                                        </button>
                                    </CardHeader>
                                    {clientSectionOpen.activity && (
                                        <CardContent className="p-0 animate-in fade-in duration-200">
                                            <div className="divide-y max-h-[400px] overflow-y-auto">
                                                {recentActivity.length === 0 && (
                                                    <div className="p-12 text-center text-muted-foreground">
                                                        <Inbox className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                        <p>No recent activity found for this client.</p>
                                                    </div>
                                                )}
                                                {recentActivity.map((activity, idx) => {
                                                    const isIncident = activity.activityType === 'incident';
                                                    const isInvoice = activity.activityType === 'invoice';
                                                    const iconBg = isIncident ? 'bg-red-500/10 text-red-600' : isInvoice ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary';
                                                    const Icon = isIncident ? AlertTriangle : isInvoice ? DollarSign : Clock;
                                                    const title = isIncident ? 'Incident Reported' : isInvoice ? `Invoice ${activity.status}` : 'Security Shift';
                                                    const sub = activity.activityType === 'shift' ? `${activity.site?.name || 'Site'} · ${new Date(activity.date).toLocaleString()}` : isIncident ? `${activity.type} · ${activity.site?.name}` : `$${activity.amount?.toLocaleString()} · ${new Date(activity.date).toLocaleDateString()}`;
                                                    return (
                                                        <div key={idx} className="flex items-start gap-3 p-4 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors">
                                                            <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-foreground">{title}</p>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{new Date(activity.date).toLocaleDateString()}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Financials Tab */}
                    <TabsContent value="financials" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Billing & Financial Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Service Rates</h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Standard Hourly Rate</Label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input type="number" className="pl-9" value={billingRates.standard} onChange={e => setBillingRates(p => ({ ...p, standard: parseInt(e.target.value) }))} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Holiday Rate</Label>
                                                        <Input type="number" value={billingRates.holiday} onChange={e => setBillingRates(p => ({ ...p, holiday: parseInt(e.target.value) }))} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Emergency Rate</Label>
                                                        <Input type="number" value={billingRates.emergency} onChange={e => setBillingRates(p => ({ ...p, emergency: parseInt(e.target.value) }))} />
                                                    </div>
                                                </div>
                                                <Button onClick={handleSaveRates} className="w-full">Save Financial Settings</Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-6 border border-border/50">
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Financial Health</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">Paid to Date</span>
                                                <span className="font-bold text-green-600">${(details.stats.totalSpend - details.stats.outstandingBalance).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">Outstanding</span>
                                                <span className="font-bold text-red-600">${details.stats.outstandingBalance.toLocaleString()}</span>
                                            </div>
                                            <div className="pt-4 border-t">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold">Lifetime Value</span>
                                                    <span className="text-lg font-bold">${details.stats.totalSpend.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg text-slate-800">Authorized Client Users</CardTitle>
                                <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-2">
                                    <UserPlus className="h-4 w-4" /> Add User
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {details.users.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                            <UserPlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                                            <p className="text-muted-foreground">No authorized portal users for this client.</p>
                                        </div>
                                    )}
                                    {details.users.map((user: any) => (
                                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <Avatar
                                                    className="h-10 w-10 border-2 border-white shadow-sm"
                                                    fallback={user.full_name?.substring(0, 2).toUpperCase() || "??"}
                                                />
                                                <div>
                                                    <p className="font-semibold">{user.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-[10px] uppercase">Access Granted</Badge>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500"><Lock className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ADD SITE DIALOG */}
                <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Site</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Site Name</Label>
                                <Input
                                    placeholder="e.g. West Wing Pharmacy"
                                    value={newSite.name}
                                    onChange={e => setNewSite(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Site Address</Label>
                                <Input
                                    placeholder="Full street address"
                                    value={newSite.address}
                                    onChange={e => setNewSite(p => ({ ...p, address: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Risk Level</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newSite.risk_level}
                                    onChange={e => setNewSite(p => ({ ...p, risk_level: e.target.value as any }))}
                                >
                                    <option value="low">Low Risk</option>
                                    <option value="medium">Medium Risk</option>
                                    <option value="high">High Risk</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddSiteOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddSite}>Add Site</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* EDIT SITE DIALOG */}
                <Dialog open={isEditSiteOpen} onOpenChange={setIsEditSiteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Site Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Site Name</Label>
                                <Input
                                    placeholder="Site Name"
                                    value={editSiteData.name || ''}
                                    onChange={e => setEditSiteData(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Site Address</Label>
                                <Input
                                    placeholder="Site Address"
                                    value={editSiteData.address || ''}
                                    onChange={e => setEditSiteData(p => ({ ...p, address: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Risk Level</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editSiteData.risk_level || 'low'}
                                    onChange={e => setEditSiteData(p => ({ ...p, risk_level: e.target.value as any }))}
                                >
                                    <option value="low">Low Risk</option>
                                    <option value="medium">Medium Risk</option>
                                    <option value="high">High Risk</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditSiteOpen(false)}>Cancel</Button>
                            <Button onClick={() => selectedSiteId && updateSiteMutation.mutate({ id: selectedSiteId, data: editSiteData })}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* DELETE SITE CONFIRM */}
                <Dialog open={isDeleteSiteConfirmOpen} onOpenChange={setIsDeleteSiteConfirmOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Remove Site</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-center">
                            <p className="text-muted-foreground">Are you sure you want to remove this site? This site will no longer appear in the schedule or active deployments.</p>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDeleteSiteConfirmOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => selectedSiteId && deleteSiteMutation.mutate(selectedSiteId)}>Confirm Deletion</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // --- DIRECTORY VIEW ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* ── HEADER BAND ── */}
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden relative z-10">
                <div className="p-5 lg:p-6 relative">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                                    <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Client Directory</h1>
                            </div>
                            <p className="text-xs text-muted-foreground">Manage clients, sites, billing, and portal access.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['clients'] })} className="h-9 rounded-xl gap-2 text-xs">
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button size="sm" onClick={() => setIsAddOpen(true)} className="h-9 rounded-xl px-4 gap-2 text-xs font-semibold">
                                <Plus className="h-3.5 w-3.5" /> Add Client
                            </Button>
                        </div>
                    </div>

                    {/* Stat strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                        <StatPill icon={Building2} label="Total" value={directoryStats.total} />
                        <StatPill icon={CheckCircle2} label="Active" value={directoryStats.active} accent="text-emerald-600 dark:text-emerald-400" />
                        <StatPill icon={Sparkles} label="Prospect" value={directoryStats.prospect} accent="text-amber-600 dark:text-amber-400" />
                        <StatPill icon={AlertTriangle} label="Terminated" value={directoryStats.terminated} accent="text-red-600 dark:text-red-400" />
                        <StatPill icon={MapPin} label="Total Sites" value={directoryStats.sites} accent="text-blue-600 dark:text-blue-400" />
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        {/* Search */}
                        <div className="relative flex-1 lg:w-72 min-w-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                                placeholder="Search clients, contacts..."
                                className="w-full h-9 pl-10 pr-4 rounded-xl border border-border/50 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                            {filter && <button onClick={() => setFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>}
                        </div>

                        {/* Filter toggle */}
                        <Button variant="outline" size="sm" onClick={() => setFiltersOpen(v => !v)} className={cn('h-9 rounded-xl gap-1.5 shrink-0 transition-all duration-200 text-xs px-3', filtersOpen && 'border-primary/50 text-primary bg-primary/5')}>
                            <Filter className="h-4 w-4" /> Filters
                            {activeFilters.length > 0 && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                        </Button>

                        {/* View toggle */}
                        <div className="flex items-center bg-muted/40 rounded-xl p-0.5 gap-0.5 shrink-0 border border-border/40 h-9 ml-auto">
                            {(['grid', 'list'] as const).map(v => (
                                <button key={v} onClick={() => setViewMode(v)} className={cn('px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all duration-200 h-full', viewMode === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Expandable filters */}
                    {filtersOpen && (
                        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-wrap gap-1.5">
                                {(['all', 'active', 'prospect', 'terminated'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            if (s === 'all') {
                                                setActiveFilters([]);
                                            } else {
                                                if (activeFilters.includes(s)) {
                                                    setActiveFilters(activeFilters.filter(f => f !== s));
                                                } else {
                                                    setActiveFilters([...activeFilters, s]);
                                                }
                                            }
                                        }}
                                        className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize',
                                            (s === 'all' && activeFilters.length === 0) || activeFilters.includes(s)
                                                ? 'bg-primary text-primary-foreground border-transparent'
                                                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                        )}
                                    >
                                        {s === 'all' ? 'All Status' : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {isLoading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                    <p className="text-muted-foreground animate-pulse">Loading directory...</p>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/20">
                    <EmptyState
                        icon={Building2}
                        title="No Clients Found"
                        description={filter ? `No clients matching "${filter}"` : "You haven't added any clients yet."}
                    />
                    {!filter && <Button onClick={() => setIsAddOpen(true)} className="mt-4">Register First Client</Button>}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {filteredData.map(client => {
                        const isActive = client.status === 'active';
                        const isProspect = client.status === 'prospect';
                        const statusColor = isActive ? 'text-emerald-500' : isProspect ? 'text-blue-500' : 'text-red-500';
                        const statusBg = isActive ? 'bg-emerald-500/10' : isProspect ? 'bg-blue-500/10' : 'bg-red-500/10';
                        const statusBorder = isActive ? 'border-emerald-500/20' : isProspect ? 'border-blue-500/20' : 'border-red-500/20';

                        return (
                            <div
                                key={client.id}
                                className="group relative bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 flex flex-col ring-1 ring-black/5 dark:ring-white/5"
                                onClick={() => handleViewClient(client)}
                            >
                                {/* Top Gradient Line */}
                                <div className={cn('absolute inset-x-0 top-0 h-1 opacity-80 group-hover:opacity-100 transition-opacity', isActive ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : isProspect ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-red-400 to-red-600')} />

                                <div className="p-4 flex flex-col flex-1">
                                    {/* Header Section */}
                                    <div className="flex items-start justify-between gap-3 mb-4 mt-0.5">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="relative shrink-0 mt-0.5">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary border border-primary/20 transition-all duration-500 group-hover:scale-110 shadow-inner">
                                                    <Building2 className="h-4.5 w-4.5" />
                                                </div>
                                                <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card shadow-sm', isActive ? 'bg-emerald-500' : isProspect ? 'bg-blue-500' : 'bg-red-500')} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors pr-1">{client.name}</h3>
                                                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                                    <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                                    <p className="text-[10px] font-medium truncate">{client.address || 'Central Headquarters'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border shadow-sm shrink-0', statusBg, statusColor, statusBorder)}>
                                            {client.status}
                                        </Badge>
                                    </div>

                                    {/* Info Panel */}
                                    <div className="bg-muted/30 rounded-xl p-3 mb-4 border border-border/40 group-hover:bg-muted/50 transition-colors">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <UserIcon className="h-2.5 w-2.5" /> Contact
                                                </div>
                                                <p className="text-[11px] font-semibold text-foreground truncate">{client.contact_name || 'Unassigned'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <Mail className="h-2.5 w-2.5" /> Email
                                                </div>
                                                <p className="text-[11px] font-semibold text-foreground truncate">{client.email || 'No Email'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operational sites summary */}
                                    <div className="mb-4 flex-1">
                                        <div className="flex items-center justify-between mb-2 px-0.5">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">Operational Sites</p>
                                            <span className="text-[9px] font-black tabular-nums bg-primary/10 text-primary px-1.5 py-0.25 rounded-md border border-primary/20">{client.sites.length}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {client.sites.length > 0 ? (
                                                <>
                                                    {client.sites.slice(0, 2).map((site, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-background border border-border/60 text-[9px] font-semibold text-foreground transition-all duration-300 group-hover:border-primary/30 shadow-sm">
                                                            {site.name}
                                                        </span>
                                                    ))}
                                                    {client.sites.length > 2 && (
                                                        <span className="text-[9px] text-muted-foreground font-bold pl-0.5 self-center">+{client.sites.length - 2}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-full text-center py-2 rounded-xl border border-dashed border-border/40 bg-muted/10">
                                                    <p className="text-[10px] text-muted-foreground italic font-medium">No sites provisioned</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Elegant Footer */}
                                    <div className="pt-3 mt-auto border-t border-border/60 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary transition-all duration-500 group-hover:text-primary-foreground shadow-sm">
                                                <Activity className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">Operations</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400">
                                            Details <ChevronRight className="h-3 w-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/40 border-b border-border/50">
                                <tr>
                                    <th className="h-12 px-6 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Client Entity</th>
                                    <th className="h-12 px-6 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Main Contact</th>
                                    <th className="h-12 px-6 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Status</th>
                                    <th className="h-12 px-6 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Operational Sites</th>
                                    <th className="h-12 px-6 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredData.map(client => {
                                    const isActive = client.status === 'active';
                                    const isProspect = client.status === 'prospect';
                                    const dot = isActive ? 'bg-emerald-500' : isProspect ? 'bg-blue-500' : 'bg-red-500';
                                    const badge = isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : isProspect ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20';
                                    return (
                                        <tr
                                            key={client.id}
                                            className="hover:bg-primary/[0.02] transition-colors cursor-pointer group"
                                            onClick={() => handleViewClient(client)}
                                        >
                                            <td className="p-4 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        <div className="h-11 w-11 rounded-xl bg-primary/5 flex items-center justify-center text-primary ring-1 ring-primary/10 group-hover:bg-primary/10 transition-all duration-300">
                                                            <Building2 className="h-5 w-5" />
                                                        </div>
                                                        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background shadow-sm', dot)} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-foreground group-hover:text-primary transition-colors text-sm truncate leading-none mb-1">{client.name}</span>
                                                        <span className="text-[11px] text-muted-foreground truncate font-medium flex items-center gap-1 opacity-80">
                                                            <MapPin className="h-2.5 w-2.5" /> {client.address || 'Central Headquarters'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 px-6">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                        <UserIcon className="h-3 w-3 text-muted-foreground" /> {client.contact_name || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-medium pl-4.5">{client.email || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="p-4 px-6 text-center">
                                                <span className={cn('inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border shadow-none shrink-0', badge)}>{client.status}</span>
                                            </td>
                                            <td className="p-4 px-6">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {client.sites.length > 0 ? (
                                                        <>
                                                            {client.sites.slice(0, 2).map((site, idx) => (
                                                                <span key={idx} className="text-[10px] px-2.5 py-1 rounded-lg bg-background border border-border/50 text-foreground font-bold shadow-sm group-hover:border-primary/20 transition-colors">
                                                                    {site.name}
                                                                </span>
                                                            ))}
                                                            {client.sites.length > 2 && <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">+{client.sites.length - 2}</span>}
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground/40 italic font-medium">No sites provisioned</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                    <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-bold uppercase tracking-tight gap-1.5 hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); handleViewClient(client); }}>
                                                        Profile <ExternalLink className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }


            {/* ADD CLIENT MODAL */}
            <Dialog open={isAddOpen} onOpenChange={(open) => {
                setIsAddOpen(open);
                if (!open) resetClientForm();
            }}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-6 border-b">
                        <DialogTitle className="text-xl">Add New Client</DialogTitle>
                    </DialogHeader>

                    <div className="p-6">
                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-2 mb-6 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${((newClientStep + 1) / clientCreationSteps.length) * 100}%` }}
                            />
                        </div>

                        {/* Step Indicator */}
                        <StepIndicator
                            steps={clientCreationSteps}
                            currentStep={newClientStep}
                            onStepClick={(step) => step < newClientStep && setNewClientStep(step)}
                            className="mb-8 hidden sm:flex"
                            size="sm"
                        />

                        <p className="sm:hidden text-xs text-muted-foreground mb-5">Step {newClientStep + 1} of {clientCreationSteps.length}: {clientCreationSteps[newClientStep].label}</p>

                        {/* Step Content */}
                        <div className="min-h-[200px]">
                            {newClientStep === 0 && (
                                <StaggerContainer className="space-y-4" show={true}>
                                    <div className="space-y-2">
                                        <Label className="text-base">Company Name *</Label>
                                        <Input
                                            value={newClient.name}
                                            onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                                            placeholder="e.g. Acme Corporation"
                                            className={`h-11 ${showClientStepErrors && clientStepErrors.company ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                                        />
                                        {showClientStepErrors && clientStepErrors.company && (
                                            <p className="text-xs text-destructive">Company name is required to continue.</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">The legal name of the client organization</p>
                                    </div>

                                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            <strong>Tip:</strong> Use the official company name as it appears on contracts and invoices.
                                        </p>
                                    </div>
                                </StaggerContainer>
                            )}

                            {newClientStep === 1 && (
                                <StaggerContainer className="space-y-4" show={true}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Contact Name *</Label>
                                            <Input
                                                value={newClient.contact_name}
                                                onChange={e => setNewClient(p => ({ ...p, contact_name: e.target.value }))}
                                                placeholder="Jane Doe"
                                                className={showClientStepErrors && clientStepErrors.contactName ? 'border-destructive focus-visible:ring-destructive/20' : ''}
                                            />
                                            {showClientStepErrors && clientStepErrors.contactName && (
                                                <p className="text-xs text-destructive">Contact name is required.</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email Address *</Label>
                                            <Input
                                                type="email"
                                                value={newClient.email}
                                                onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                                                placeholder="jane@company.com"
                                                className={showClientStepErrors && (clientStepErrors.emailRequired || clientStepErrors.emailFormat) ? 'border-destructive focus-visible:ring-destructive/20' : ''}
                                            />
                                            {showClientStepErrors && clientStepErrors.emailRequired && (
                                                <p className="text-xs text-destructive">Email is required.</p>
                                            )}
                                            {showClientStepErrors && !clientStepErrors.emailRequired && clientStepErrors.emailFormat && (
                                                <p className="text-xs text-destructive">Enter a valid email address.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900">
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            This person will receive all notifications and can access the client portal.
                                        </p>
                                    </div>
                                </StaggerContainer>
                            )}

                            {newClientStep === 2 && (
                                <StaggerContainer className="space-y-4" show={true}>
                                    <div className="space-y-2">
                                        <Label>Billing Address</Label>
                                        <Input
                                            value={newClient.address}
                                            onChange={e => setNewClient(p => ({ ...p, address: e.target.value }))}
                                            placeholder="123 Corporate Blvd, Suite 100, City, State 12345"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Account Status</Label>
                                        <select
                                            className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                            value={newClient.status}
                                            onChange={(e) => setNewClient(p => ({ ...p, status: e.target.value as any }))}
                                        >
                                            <option value="active">Active - Services can begin immediately</option>
                                            <option value="prospect">Prospect - Still in negotiation</option>
                                        </select>
                                    </div>
                                </StaggerContainer>
                            )}

                            {newClientStep === 3 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Company</span>
                                            <span className="font-medium">{newClient.name || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Contact</span>
                                            <span className="font-medium">{newClient.contact_name || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Email</span>
                                            <span className="font-medium">{newClient.email || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Address</span>
                                            <span className="font-medium">{newClient.address || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <Badge variant={newClient.status === 'active' ? 'success' : 'default'}>
                                                {newClient.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {(!newClient.name || !newClient.contact_name || !newClient.email ? (
                                        <Shimmer className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900">
                                            <p className="text-sm text-red-800 dark:text-red-300">
                                                Please complete all required fields (marked with *) before creating the client.
                                            </p>
                                        </Shimmer>
                                    ) : null)}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 bg-muted/30 border-t flex items-center justify-between gap-3">
                        <PressButton
                            variant="outline"
                            onClick={() => {
                                if (newClientStep === 0) {
                                    setIsAddOpen(false);
                                    resetClientForm();
                                } else {
                                    setNewClientStep(prev => prev - 1);
                                    setShowClientStepErrors(false);
                                }
                            }}
                        >
                            {newClientStep === 0 ? 'Cancel' : '← Back'}
                        </PressButton>

                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                                Step {newClientStep + 1} of {clientCreationSteps.length}
                            </span>

                            {newClientStep < clientCreationSteps.length - 1 ? (
                                <Button
                                    onClick={() => {
                                        if (!canProceedClientStep) {
                                            setShowClientStepErrors(true);
                                            return;
                                        }
                                        setShowClientStepErrors(false);
                                        setNewClientStep(prev => prev + 1);
                                    }}
                                >
                                    Continue →
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => {
                                        if (clientStepErrors.company) {
                                            setNewClientStep(0);
                                            setShowClientStepErrors(true);
                                            return;
                                        }
                                        if (clientStepErrors.contactName || clientStepErrors.emailRequired || clientStepErrors.emailFormat) {
                                            setNewClientStep(1);
                                            setShowClientStepErrors(true);
                                            return;
                                        }
                                        setShowClientStepErrors(false);
                                        handleAddClient();
                                    }}
                                    disabled={createClientMutation.isPending}
                                >
                                    {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Client
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Global UI feedback components */}
            <SuccessComponent />
            <ConfettiComponent />
        </div >
    );
}
