
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui';
import { db } from '../lib/db';
import { Incident } from '../lib/types';
import { AlertTriangle, FileText, Download, TrendingUp, DollarSign, Loader2, Calendar, Mail, ShieldCheck, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '../components/EmptyState';

export default function Reports() {
    const { profile, organization } = useAuth();
    const isClient = profile?.role === 'client';

    // DAR State
    const [darDate, setDarDate] = useState(new Date().toISOString().split('T')[0]);
    const [isDarPreviewOpen, setIsDarPreviewOpen] = useState(false);
    const [darData, setDarData] = useState<any>(null);
    const [isEmailing, setIsEmailing] = useState(false);

    // --- QUERIES ---
    const { data: incidents = [], isLoading: isLoadingIncidents } = useQuery({
        queryKey: ['incidents', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.getFullIncidents(organization.id);
            let list = data || [];
            if (isClient && profile?.client_id) {
                const { data: sites } = await db.sites.select(organization.id);
                const mySiteIds = sites?.filter(s => s.client_id === profile.client_id).map(s => s.id) || [];
                list = list.filter(i => mySiteIds.includes(i.site_id));
            }
            return list;
        }
    });

    const { data: billingStats = [], isLoading: isLoadingStats } = useQuery({
        queryKey: ['billingStats', organization?.id],
        enabled: !isClient && !!organization, // Admins only for full billing stats
        queryFn: async () => {
            if (!organization) return [];
            const { data: timeData } = await db.getFullTimeEntries(organization.id);
            if (timeData) {
                const clientMap = new Map();
                timeData.forEach((entry: any) => {
                    const clientName = entry.shift?.site?.client?.name || 'Unknown Client';
                    const current = clientMap.get(clientName) || { hours: 0, cost: 0, entries: 0 };
                    current.hours += entry.total_hours;
                    current.entries += 1;
                    // Mock rate: $45/hr (simplified calculation for report overview)
                    current.cost += entry.total_hours * 45;
                    clientMap.set(clientName, current);
                });
                return Array.from(clientMap.entries()).map(([name, data]) => ({ name, ...data }));
            }
            return [];
        }
    });

    const isLoading = isLoadingIncidents || (isLoadingStats && !isClient);

    const getSeverityColor = (s: string) => {
        switch (s) {
            case 'critical': return 'destructive';
            case 'high': return 'destructive';
            case 'medium': return 'warning';
            default: return 'secondary';
        }
    };

    const handleGenerateDar = async () => {
        // Aggregate data for the specific date
        // In a real app, this would query backend. Here we mock aggregation from loaded data.

        // 1. Get Shifts for Date
        if (!organization) return;
        const { data: allShifts } = await db.getFullSchedule(organization.id);
        const shifts = (allShifts || []).filter((s: any) =>
            s.start_time.startsWith(darDate) &&
            (isClient ? s.site?.client_id === profile?.client_id : true)
        );

        // 2. Get Incidents for Date
        const incs = incidents.filter(i => i.reported_at.startsWith(darDate));

        setDarData({
            date: darDate,
            shifts,
            incidents: incs,
            clientName: isClient ? 'Your Company' : 'All Clients'
        });
        setIsDarPreviewOpen(true);
    };

    const handleEmailDar = () => {
        setIsEmailing(true);
        setTimeout(() => {
            setIsEmailing(false);
            setIsDarPreviewOpen(false);
            alert(`DAR for ${darDate} has been emailed to ${profile?.email}`);
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Reports & Analytics</h2>
                {!isClient && (
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export Report
                    </Button>
                )}
            </div>

            <Tabs defaultValue={isClient ? "dar" : "incidents"} className="space-y-4">
                <TabsList>
                    {isClient && <TabsTrigger value="dar" className="gap-2"><FileText className="h-4 w-4" /> Daily Activity Reports</TabsTrigger>}
                    <TabsTrigger value="incidents" className="gap-2"><AlertTriangle className="h-4 w-4" /> Incident Log</TabsTrigger>
                    {!isClient && <TabsTrigger value="billing" className="gap-2"><DollarSign className="h-4 w-4" /> Billing & Costs</TabsTrigger>}
                </TabsList>

                {isClient && (
                    <TabsContent value="dar">
                        <Card>
                            <CardHeader><CardTitle>Daily Activity Report (DAR)</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-muted/50 border border-border rounded-lg max-w-lg">
                                    <Label className="mb-2 block">Select Report Date</Label>
                                    <div className="flex gap-2">
                                        <Input type="date" value={darDate} onChange={(e) => setDarDate(e.target.value)} className="bg-background" />
                                        <Button onClick={handleGenerateDar}>Generate Preview</Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Generates a summary of all shifts, officer logs, and incidents for the selected date.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="incidents">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Incidents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
                                <div className="space-y-4">
                                    {incidents.length === 0 && (
                                        <EmptyState
                                            icon={ShieldCheck}
                                            title="No Incidents Reported"
                                            description="Great news! No incidents have been reported in this period."
                                            size="md"
                                        />
                                    )}
                                    {incidents.map(inc => (
                                        <div key={inc.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg items-start">
                                            <div className={`p-2 rounded-full shrink-0 ${inc.severity === 'high' || inc.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold capitalize">{inc.type} Incident</h4>
                                                    <span className="text-xs text-muted-foreground">{new Date(inc.reported_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm">{inc.description}</p>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                    <span>Site: <span className="font-medium text-foreground">{inc.site?.name}</span></span>
                                                    <span>•</span>
                                                    <span>Officer: <span className="font-medium text-foreground">{inc.officer?.full_name}</span></span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant={getSeverityColor(inc.severity)} className="capitalize">{inc.severity}</Badge>
                                                <Badge variant="outline" className="capitalize">{inc.status}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing">
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                                {billingStats.map((stat: any) => (
                                    <Card key={stat.name}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">${stat.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            <p className="text-xs text-muted-foreground mt-1">{stat.hours.toFixed(1)} hrs logged ({stat.entries} entries)</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Unbilled Activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="h-10 px-4 text-left font-medium">Client</th>
                                                    <th className="h-10 px-4 text-left font-medium">Total Shifts</th>
                                                    <th className="h-10 px-4 text-left font-medium">Total Hours</th>
                                                    <th className="h-10 px-4 text-right font-medium">Est. Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {billingStats.map((stat: any, i: number) => (
                                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                                                        <td className="p-4 font-medium">{stat.name}</td>
                                                        <td className="p-4">{stat.entries}</td>
                                                        <td className="p-4">{stat.hours.toFixed(2)}</td>
                                                        <td className="p-4 text-right">${stat.cost.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                {billingStats.length === 0 && (
                                                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No billing data available.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* DAR Preview Modal */}
            <Dialog open={isDarPreviewOpen} onOpenChange={setIsDarPreviewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Daily Activity Report: {darData?.date}</DialogTitle>
                    </DialogHeader>
                    <div className="border border-border p-6 rounded-md bg-card text-sm space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="flex justify-between border-b pb-4">
                            <div>
                                <h3 className="font-bold text-lg">Guardian Security</h3>
                                <p className="text-muted-foreground">Daily Activity Report</p>
                            </div>
                            <div className="text-right">
                                <p>Date: {darData?.date}</p>
                                <p className="text-muted-foreground">Generated: {new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4 text-center py-2 bg-muted/50 rounded">
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Total Shifts</p>
                                <p className="font-bold text-lg">{darData?.shifts.length}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Incidents</p>
                                <p className="font-bold text-lg">{darData?.incidents.length}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Sites Covered</p>
                                <p className="font-bold text-lg">{new Set(darData?.shifts.map((s: any) => s.site_id)).size}</p>
                            </div>
                        </div>

                        {/* Incident Section */}
                        <div>
                            <h4 className="font-bold border-b mb-2 pb-1">Incident Log</h4>
                            {darData?.incidents.length === 0 ? (
                                <EmptyState
                                    icon={ShieldCheck}
                                    title="No Incidents"
                                    description="No incidents were reported on this day."
                                    size="sm"
                                />
                            ) : (
                                <div className="space-y-2">
                                    {darData?.incidents.map((inc: any) => (
                                        <div key={inc.id} className="p-2 border rounded bg-red-50/50 border-red-100">
                                            <div className="flex justify-between font-medium text-red-900">
                                                <span>{inc.type} - {inc.severity}</span>
                                                <span>{new Date(inc.reported_at).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="mt-1">{inc.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Location: {inc.site?.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Shift Log Section */}
                        <div>
                            <h4 className="font-bold border-b mb-2 pb-1">Shift Activity</h4>
                            {darData?.shifts.length === 0 ? (
                                <EmptyState
                                    icon={CalendarDays}
                                    title="No Shifts Recorded"
                                    description="No shift activity was recorded on this day."
                                    size="sm"
                                />
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="text-xs text-muted-foreground bg-muted/50">
                                        <tr>
                                            <th className="p-2">Site</th>
                                            <th className="p-2">Officer</th>
                                            <th className="p-2">Time</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {darData?.shifts.map((s: any) => (
                                            <tr key={s.id}>
                                                <td className="p-2">{s.site?.name}</td>
                                                <td className="p-2">{s.officer?.full_name || 'Unassigned'}</td>
                                                <td className="p-2">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="p-2 capitalize">{s.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDarPreviewOpen(false)}>Close</Button>
                        <Button onClick={handleEmailDar} disabled={isEmailing} className="gap-2">
                            {isEmailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Email Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
