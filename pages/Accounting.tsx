
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Avatar, cn } from '../components/ui';
import { db } from '../lib/db';
import { PayrollRun, Client } from '../lib/types';
import { buildAccountingExceptionData, type AccountingException } from '../lib/accountingExceptions';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, CreditCard, TrendingUp, Download, Briefcase, CheckCircle2, AlertCircle, Plus, FileText, Send, Calendar, Filter, Eye, ArrowLeft, Minimize2, Maximize2, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';

function StatPill({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card px-4 py-3 min-w-0 transition-all duration-200 hover:border-border/60 hover:shadow-sm">
            <div className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', accent ?? 'text-muted-foreground')}>
                <Icon className="h-3.5 w-3.5 shrink-0" />{label}
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums leading-none mt-1 tracking-tight">{value}</p>
        </div>
    );
}

function ExceptionMetricCard({ label, value, hint, tone = 'slate' }: { label: string; value: string | number; hint: string; tone?: 'slate' | 'amber' | 'red' | 'emerald' }) {
    const toneClass = tone === 'red'
        ? 'text-red-600 dark:text-red-400'
        : tone === 'amber'
            ? 'text-amber-600 dark:text-amber-400'
            : tone === 'emerald'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground';

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold mt-2', toneClass)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
    );
}

function ExceptionSeverityBadge({ severity }: { severity: AccountingException['severity'] }) {
    if (severity === 'high') return <Badge variant="destructive">High</Badge>;
    if (severity === 'medium') return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
}

function formatExceptionType(type: AccountingException['type']) {
    if (type === 'missing_approval') return 'Missing Approval';
    if (type === 'duplicate_entry') return 'Duplicate Entry';
    if (type === 'rate_mismatch') return 'Rate Review';
    if (type === 'unbilled_entry') return 'Unbilled Work';
    return 'Overtime';
}

function formatExceptionAction(exception: AccountingException) {
    if (exception.action === 'approve_entry') return 'Approve Entry';
    if (exception.action === 'open_invoice') return 'Create Invoice';
    return 'Investigate';
}

export default function Accounting() {
    const { profile, organization } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'payroll' | 'invoices' | 'exceptions'>('payroll');
    const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
    const isCompact = density === 'compact';

    // Data State
    const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]); // Invoices with Client populated
    const [clients, setClients] = useState<Client[]>([]);

    // Payroll Calc State
    const [rawTimeEntries, setRawTimeEntries] = useState<any[]>([]);
    const [payrollCandidates, setPayrollCandidates] = useState<any[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

    // Date Range State
    const [payPeriodStart, setPayPeriodStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d.toISOString().split('T')[0];
    });
    const [payPeriodEnd, setPayPeriodEnd] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    // Modals
    const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
    const [invoicePreview, setInvoicePreview] = useState<any>(null); // If set, modal is open
    const [payrollSearch, setPayrollSearch] = useState('');
    const [payrollViewFilter, setPayrollViewFilter] = useState<'all' | 'overtime' | 'deductions'>('all');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
    const [invoiceSort, setInvoiceSort] = useState<'newest' | 'oldest' | 'amount_desc' | 'amount_asc'>('newest');
    const [exceptionFilter, setExceptionFilter] = useState<'all' | 'high' | 'payroll' | 'billing'>('all');
    const [exceptionActionId, setExceptionActionId] = useState<string | null>(null);

    useEffect(() => {
        if (organization) {
            loadData();
        }
    }, [organization]);

    const loadData = async () => {
        setIsLoading(true);
        if (!organization) return;
        const [payRes, invRes, timeRes, clientRes] = await Promise.all([
            db.payrolls.select(organization.id),
            db.getFullInvoices(organization.id),
            db.getFullTimeEntries(organization.id),
            db.clients.select(organization.id)
        ]);

        setPayrolls(payRes.data || []);
        setInvoices(invRes.data || []);
        setClients(clientRes.data || []);
        setRawTimeEntries(timeRes.data || []);

        setIsLoading(false);
    };

    const exceptionData = useMemo(() => buildAccountingExceptionData({
        entries: rawTimeEntries,
        clients,
        payPeriodStart,
        payPeriodEnd
    }), [rawTimeEntries, clients, payPeriodStart, payPeriodEnd]);

    const unbilledEntries = exceptionData.unbilled_entries;
    const payrollReadyEntries = exceptionData.payroll_ready_entries;

    // Recalculate Payroll Candidates when dates or raw data change
    useEffect(() => {
        if (payrollReadyEntries.length === 0) {
            setPayrollCandidates([]);
            return;
        }

        // Group candidates by Officer
        const officerMap = new Map();
        payrollReadyEntries.forEach((e: any) => {
            const officerName = e.officer?.full_name || 'Unknown';
            const current = officerMap.get(officerName) || {
                officer: e.officer,
                regular: 0,
                overtime: 0,
                gross_pay: 0,
                hours: 0,
                deductions_total: 0,
                entries: []
            };

            // Use officer specific rates
            // Check shift specific rate first, then officer base rate
            const baseRate = e.shift?.pay_rate || e.officer?.financials?.base_rate || 20;
            const otRate = e.officer?.financials?.overtime_rate || (baseRate * 1.5);

            const hours = e.total_hours;
            // Simple OT logic: > 8 hrs in a day is OT (California style)
            const reg = Math.min(hours, 8);
            const ot = Math.max(0, hours - 8);

            current.hours += hours;
            current.regular += reg;
            current.overtime += ot;
            const entryPay = (reg * baseRate) + (ot * otRate);
            current.gross_pay += entryPay;

            // Push entry detail
            current.entries.push({
                ...e,
                calculated_reg: reg,
                calculated_ot: ot,
                applied_base_rate: baseRate,
                applied_ot_rate: otRate,
                total_pay: entryPay,
                is_custom_rate: !!e.shift?.pay_rate
            });

            officerMap.set(officerName, current);
        });

        // Apply fixed deductions ONCE per payroll period (simplified logic)
        const finalCandidates = Array.from(officerMap.values()).map((c: any) => {
            const deductionList = c.officer?.financials?.deductions || [];
            const totalDeductions = deductionList.reduce((acc: number, d: any) => acc + d.amount, 0);

            // Sort entries by date
            c.entries.sort((a: any, b: any) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

            return {
                ...c,
                deductions_total: totalDeductions,
                net_pay: Math.max(0, c.gross_pay - totalDeductions)
            };
        });

        setPayrollCandidates(finalCandidates);
    }, [payrollReadyEntries]);

    // --- ACTIONS ---

    const handleCreateInvoice = async (client: Client, entryIds?: string[]) => {
        // Filter unbilled entries for this client
        const clientEntries = unbilledEntries.filter((e) =>
            e.shift?.site?.client_id === client.id &&
            (!entryIds || entryIds.includes(e.id))
        );
        if (clientEntries.length === 0) return;

        // Group by rate to handle varied shift rates
        const itemsMap = new Map<number, number>(); // rate -> hours
        clientEntries.forEach(e => {
            const rate = e.shift?.bill_rate || client.billing_settings?.standard_rate || 45;
            itemsMap.set(rate, (itemsMap.get(rate) || 0) + e.total_hours);
        });

        const items: any[] = [];
        let totalAmount = 0;

        itemsMap.forEach((hrs, rate) => {
            const amt = hrs * rate;
            totalAmount += amt;
            items.push({
                description: `Security Services ($${rate}/hr)`,
                quantity: hrs,
                rate: rate,
                amount: amt
            });
        });

        const newInvoice = {
            client_id: client.id,
            invoice_number: `INV-${Math.floor(Math.random() * 10000)}`,
            issue_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            amount: totalAmount,
            status: 'draft',
            items: items,
            time_entry_ids: clientEntries.map((entry) => entry.id)
        };

        // Optimistic UI
        setInvoicePreview({ ...newInvoice, client });
    };

    const confirmInvoice = async () => {
        if (!invoicePreview) return;

        const res = await db.invoices.create({
            organization_id: organization?.id || '',
            client_id: invoicePreview.client_id,
            invoice_number: invoicePreview.invoice_number,
            issue_date: invoicePreview.issue_date,
            due_date: invoicePreview.due_date,
            amount: invoicePreview.amount,
            status: 'sent', // Auto send
            items: invoicePreview.items,
            time_entry_ids: invoicePreview.time_entry_ids
        });

        await Promise.all((invoicePreview.time_entry_ids || []).map((entryId: string) =>
            db.time_entries.update(entryId, {
                billing_status: 'invoiced',
                invoice_id: res.data.id,
                invoiced_at: new Date().toISOString()
            })
        ));

        // Audit Log
        db.audit_logs.create({
            action: 'create',
            description: `Generated Invoice #${invoicePreview.invoice_number} for ${invoicePreview.client.name}`,
            performed_by: profile?.full_name || 'System',
            performed_by_id: profile?.id || 'system',
            target_resource: 'Invoice',
            target_id: res.data.id,
            organization_id: organization?.id || '',
            timestamp: new Date().toISOString()
        });

        setInvoicePreview(null);
        loadData(); // Refresh
    };

    const handleRunPayroll = async () => {
        const total = payrollCandidates.reduce((acc, curr) => acc + curr.net_pay, 0);
        const count = payrollCandidates.length;
        const timeEntryIds = Array.from(new Set<string>(payrollCandidates.flatMap((candidate: any) =>
            candidate.entries.map((entry: any) => entry.id as string)
        )));

        const res = await db.payrolls.create({
            organization_id: organization?.id || '',
            period_start: new Date(payPeriodStart).toISOString(),
            period_end: new Date(payPeriodEnd).toISOString(),
            total_amount: total,
            status: 'paid',
            officer_count: count,
            processed_at: new Date().toISOString(),
            time_entry_ids: timeEntryIds
        });

        await Promise.all(timeEntryIds.map((entryId) =>
            db.time_entries.update(entryId, {
                payroll_status: 'processed',
                payroll_run_id: res.data.id,
                payroll_processed_at: new Date().toISOString()
            })
        ));

        // Audit Log
        db.audit_logs.create({
            action: 'process',
            description: `Processed Payroll for ${count} officers. Total: $${total.toFixed(2)}`,
            performed_by: profile?.full_name || 'System',
            performed_by_id: profile?.id || 'system',
            target_resource: 'Payroll',
            target_id: res.data.id,
            organization_id: organization?.id || '',
            timestamp: new Date().toISOString()
        });

        setIsProcessPayrollOpen(false);
        loadData();
    };

    const handleExceptionAction = async (exception: AccountingException) => {
        if (exception.action === 'review') return;

        setExceptionActionId(exception.id);
        try {
            if (exception.action === 'approve_entry' && exception.entry_ids[0]) {
                await db.time_entries.update(exception.entry_ids[0], {
                    status: 'approved',
                    billing_status: 'unbilled',
                    payroll_status: 'ready'
                });
                await loadData();
                return;
            }

            if (exception.action === 'open_invoice' && exception.client_id) {
                const client = clients.find((item) => item.id === exception.client_id);
                if (client) {
                    await handleCreateInvoice(client, exception.entry_ids);
                }
            }
        } finally {
            setExceptionActionId(null);
        }
    };

    // --- HELPERS ---
    const setPreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setPayPeriodEnd(end.toISOString().split('T')[0]);
        setPayPeriodStart(start.toISOString().split('T')[0]);
    };

    const setLastMonth = () => {
        const date = new Date();
        date.setDate(0); // Last day of prev month
        const end = date.toISOString().split('T')[0];
        date.setDate(1); // First day of prev month
        const start = date.toISOString().split('T')[0];
        setPayPeriodEnd(end);
        setPayPeriodStart(start);
    };

    // --- STATS CALC ---
    const totalRevenue = invoices.reduce((acc, curr) => acc + (curr.status !== 'draft' ? curr.amount : 0), 0);
    const totalPayroll = payrolls.reduce((acc, curr) => acc + curr.total_amount, 0);
    const netMargin = totalRevenue - totalPayroll;
    const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
    const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0);
    const cellY = isCompact ? 'py-2.5' : 'py-4';
    const cellX = isCompact ? 'px-4' : 'px-6';

    const filteredPayrollCandidates = useMemo(() => {
        const q = payrollSearch.trim().toLowerCase();
        return payrollCandidates.filter((candidate: any) => {
            const name = candidate.officer?.full_name?.toLowerCase() || '';
            const badge = candidate.officer?.badge_number?.toLowerCase() || '';
            const matchesSearch = !q || name.includes(q) || badge.includes(q);
            const matchesView = payrollViewFilter === 'all' ||
                (payrollViewFilter === 'overtime' && candidate.overtime > 0) ||
                (payrollViewFilter === 'deductions' && candidate.deductions_total > 0);
            return matchesSearch && matchesView;
        });
    }, [payrollCandidates, payrollSearch, payrollViewFilter]);

    const filteredInvoices = useMemo(() => {
        const q = invoiceSearch.trim().toLowerCase();
        const filtered = invoices.filter((invoice: any) => {
            const matchesStatus = invoiceStatusFilter === 'all' || invoice.status === invoiceStatusFilter;
            const matchesSearch = !q ||
                (invoice.invoice_number || '').toLowerCase().includes(q) ||
                (invoice.client?.name || '').toLowerCase().includes(q);
            return matchesStatus && matchesSearch;
        });

        filtered.sort((a: any, b: any) => {
            if (invoiceSort === 'newest') return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
            if (invoiceSort === 'oldest') return new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime();
            if (invoiceSort === 'amount_desc') return b.amount - a.amount;
            return a.amount - b.amount;
        });

        return filtered;
    }, [invoices, invoiceSearch, invoiceStatusFilter, invoiceSort]);

    const filteredExceptions = useMemo(() => {
        return exceptionData.exceptions.filter((exception) => {
            if (exceptionFilter === 'high') return exception.severity === 'high';
            if (exceptionFilter === 'payroll') {
                return exception.type === 'missing_approval' ||
                    exception.type === 'overtime' ||
                    exception.type === 'duplicate_entry' ||
                    exception.type === 'rate_mismatch';
            }
            if (exceptionFilter === 'billing') return exception.type === 'unbilled_entry';
            return true;
        });
    }, [exceptionData.exceptions, exceptionFilter]);

    const exportLedger = () => {
        const rows = [
            ...payrolls.map((p) => ['payroll', p.id, new Date(p.period_start).toISOString(), new Date(p.period_end).toISOString(), p.status, p.total_amount]),
            ...filteredInvoices.map((i: any) => ['invoice', i.id, new Date(i.issue_date).toISOString(), new Date(i.due_date).toISOString(), i.status, i.amount])
        ];

        const csv = [
            ['type', 'id', 'start_or_issue', 'end_or_due', 'status', 'amount'],
            ...rows
        ]
            .map((row) => row.map((value) => `"${String(value ?? '').replace(/\"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `accounting-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Tabs defaultValue="payroll" value={activeTab} onValueChange={(value) => setActiveTab(value as 'payroll' | 'invoices' | 'exceptions')} className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* ── HEADER BAND ── */}
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden relative z-10">
                <div className="p-5 lg:p-6 relative">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                                    <DollarSign className="h-4 w-4 text-primary" />
                                </div>
                                <h1 className="text-lg font-bold tracking-tight text-foreground">Accounting & Finance</h1>
                            </div>
                            <p className="text-xs text-muted-foreground">Manage payroll, billing, and financial health.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={loadData} className="h-9 rounded-xl gap-2 text-xs">
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button size="sm" onClick={exportLedger} className="h-9 rounded-xl px-4 gap-2 text-xs font-semibold">
                                <Download className="h-3.5 w-3.5" /> Export Ledger
                            </Button>
                        </div>
                    </div>

                    {/* Stat strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                        <StatPill icon={TrendingUp} label="Revenue (YTD)" value={`$${totalRevenue.toLocaleString()}`} />
                        <StatPill icon={CreditCard} label="Payroll Cost" value={`$${totalPayroll.toLocaleString()}`} accent="text-blue-600 dark:text-blue-400" />
                        <StatPill icon={DollarSign} label="Net Margin" value={`$${netMargin.toLocaleString()}`} accent={netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                        <StatPill icon={AlertCircle} label="Outstanding" value={outstandingInvoices} accent="text-amber-600 dark:text-amber-400" />
                        <StatPill icon={AlertCircle} label="Exceptions" value={exceptionData.summary.total} accent={exceptionData.summary.high_severity > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'} />
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
                        <div className="flex items-center gap-2">
                            <TabsList className="h-9 bg-muted/40 p-1 border border-border/40">
                                <TabsTrigger value="payroll" className="px-3 text-xs gap-2"><Briefcase className="h-3 w-3" /> Payroll</TabsTrigger>
                                <TabsTrigger value="invoices" className="px-3 text-xs gap-2"><FileText className="h-3 w-3" /> Invoices</TabsTrigger>
                                <TabsTrigger value="exceptions" className="px-3 text-xs gap-2"><AlertCircle className="h-3 w-3" /> Exceptions</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-muted/40 rounded-xl p-0.5 gap-0.5 border border-border/40 h-9">
                                <button
                                    onClick={() => setDensity('compact')}
                                    className={cn('px-2.5 py-1 rounded-lg transition-all duration-200 h-full flex items-center', isCompact ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    <Minimize2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setDensity('comfortable')}
                                    className={cn('px-2.5 py-1 rounded-lg transition-all duration-200 h-full flex items-center', !isCompact ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial attention alert if needed */}
            {(netMargin < 0 || overdueAmount > 0 || exceptionData.summary.high_severity > 0) && (
                <div className="rounded-xl border border-amber-300/30 bg-amber-500/5 px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Financial Priority</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {overdueAmount > 0 ? `Overdue receivables: $${overdueAmount.toLocaleString()}. ` : ''}
                                {exceptionData.summary.high_severity > 0 ? `${exceptionData.summary.high_severity} high-severity accounting exceptions need review. ` : ''}
                                Action required to maintain healthy operations.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[10px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                        onClick={() => {
                            if (exceptionData.summary.high_severity > 0) {
                                setActiveTab('exceptions');
                                setExceptionFilter('high');
                            } else {
                                setActiveTab('invoices');
                                setInvoiceStatusFilter('overdue');
                            }
                        }}
                    >
                        Review Now <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            )}

            {/* TAB CONTENT AREA */}
            <div className="flex-1 min-h-0 min-w-0">
                {/* PAYROLL TAB */}
                <TabsContent value="payroll" className="h-full flex flex-col space-y-4 m-0 overflow-y-auto pr-1">
                    {selectedCandidate ? (
                        // --- DETAIL VIEW (DRILL-DOWN) ---
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCandidate(null)} className="gap-1 pl-0 text-muted-foreground hover:text-foreground">
                                    <ArrowLeft className="h-4 w-4" /> Back to Payroll List
                                </Button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left Sidebar: Officer Info */}
                                <Card className="w-full md:w-1/3 h-fit">
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <Avatar fallback={selectedCandidate.officer?.full_name[0]} className="h-16 w-16 border-2 border-muted" />
                                        <div>
                                            <CardTitle className="text-xl">{selectedCandidate.officer?.full_name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{selectedCandidate.officer?.badge_number}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4 border-t">
                                        {/* Financial Summary */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Base Rate</span>
                                                <span className="font-medium">${selectedCandidate.officer?.financials?.base_rate}/hr</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Overtime Rate</span>
                                                <span className="font-medium">${selectedCandidate.officer?.financials?.overtime_rate}/hr</span>
                                            </div>
                                            <div className="pt-2 border-t mt-2">
                                                <div className="flex justify-between font-bold text-lg">
                                                    <span>Net Pay</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400">${selectedCandidate.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Deductions List */}
                                        {selectedCandidate.deductions_total > 0 && (
                                            <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                                <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Deductions</p>
                                                {selectedCandidate.officer?.financials?.deductions.map((d: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm text-red-700 dark:text-red-300">
                                                        <span>{d.name}</span>
                                                        <span>-${d.amount.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Right Content: Breakdown */}
                                <div className="flex-1 space-y-6">
                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card>
                                            <CardContent className="p-4 text-center">
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Regular Hrs</p>
                                                <p className="text-xl font-bold mt-1">{selectedCandidate.regular.toFixed(1)}</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4 text-center">
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-amber-600 dark:text-amber-500">Overtime Hrs</p>
                                                <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-500">{selectedCandidate.overtime.toFixed(1)}</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4 text-center">
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-blue-600 dark:text-blue-400">Gross Pay</p>
                                                <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">${selectedCandidate.gross_pay.toLocaleString()}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Detailed Table */}
                                    <Card>
                                        <CardHeader className="pb-3 border-b">
                                            <CardTitle className="text-base">Shift Breakdown</CardTitle>
                                        </CardHeader>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-left font-medium text-muted-foreground`}>Date</th>
                                                        <th className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-left font-medium text-muted-foreground`}>Site</th>
                                                        <th className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-right font-medium text-muted-foreground`}>Hours</th>
                                                        <th className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-right font-medium text-muted-foreground`}>Rate</th>
                                                        <th className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-right font-medium text-muted-foreground`}>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {selectedCandidate.entries.map((e: any, i: number) => (
                                                        <tr key={i} className="hover:bg-muted/10">
                                                            <td className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} font-medium whitespace-nowrap`}>
                                                                {new Date(e.clock_in).toLocaleDateString()}
                                                                <div className="text-xs text-muted-foreground font-normal">
                                                                    {new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                                    {e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                                </div>
                                                            </td>
                                                            <td className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'}`}>{e.shift?.site?.name}</td>
                                                            <td className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-right`}>
                                                                <div>{e.calculated_reg.toFixed(1)} <span className="text-xs text-muted-foreground">reg</span></div>
                                                                {e.calculated_ot > 0 && <div className="text-amber-600 font-semibold">{e.calculated_ot.toFixed(1)} <span className="text-xs text-amber-600/70">ot</span></div>}
                                                            </td>
                                                            <td className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-right`}>
                                                                <div>${e.applied_base_rate}</div>
                                                                {e.calculated_ot > 0 && <div className="text-xs text-muted-foreground">${e.applied_ot_rate} (OT)</div>}
                                                            </td>
                                                            <td className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-right font-mono font-medium`}>
                                                                ${e.total_pay.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- MAIN LIST VIEW ---
                        <>
                            {/* DATE CONTROLS */}
                            <div className="bg-card p-4 rounded-lg border border-border mb-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex flex-col sm:flex-row items-end gap-4">
                                    <div className="grid gap-1.5 flex-1 w-full">
                                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                            <Filter className="h-3 w-3" /> Officer Search
                                        </label>
                                        <Input value={payrollSearch} onChange={(e) => setPayrollSearch(e.target.value)} placeholder="Search by officer or badge" className="bg-background w-full" />
                                    </div>
                                    <div className="grid gap-1.5 flex-1 w-full">
                                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> Period Start
                                        </label>
                                        <Input
                                            type="date"
                                            value={payPeriodStart}
                                            onChange={(e) => setPayPeriodStart(e.target.value)}
                                            className="bg-background w-full"
                                        />
                                    </div>
                                    <div className="grid gap-1.5 flex-1 w-full">
                                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> Period End
                                        </label>
                                        <Input
                                            type="date"
                                            value={payPeriodEnd}
                                            onChange={(e) => setPayPeriodEnd(e.target.value)}
                                            className="bg-background w-full"
                                        />
                                    </div>
                                    <div className="flex gap-2 pb-0.5 w-full sm:w-auto">
                                        <Button variant={payrollViewFilter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setPayrollViewFilter('all')} className="flex-1 sm:flex-none">All</Button>
                                        <Button variant={payrollViewFilter === 'overtime' ? 'secondary' : 'outline'} size="sm" onClick={() => setPayrollViewFilter('overtime')} className="flex-1 sm:flex-none">Overtime</Button>
                                        <Button variant={payrollViewFilter === 'deductions' ? 'secondary' : 'outline'} size="sm" onClick={() => setPayrollViewFilter('deductions')} className="flex-1 sm:flex-none">Deductions</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPreset(7)} className="flex-1 sm:flex-none">Last 7 Days</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPreset(14)} className="flex-1 sm:flex-none">Last 14 Days</Button>
                                        <Button variant="outline" size="sm" onClick={setLastMonth} className="flex-1 sm:flex-none">Last Month</Button>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">Showing {filteredPayrollCandidates.length} of {payrollCandidates.length} officers in this period</p>
                            </div>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Process Payroll</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Reviewing approved hours from <strong>{new Date(payPeriodStart).toLocaleDateString()}</strong> to <strong>{new Date(payPeriodEnd).toLocaleDateString()}</strong>.
                                        </p>
                                    </div>
                                    <Button onClick={() => setIsProcessPayrollOpen(true)} disabled={payrollCandidates.length === 0}>
                                        Review & Run Payroll
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="rounded-none border-t border-border overflow-hidden max-h-[58vh] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                                                <tr>
                                                    <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Officer</th>
                                                    <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Total Hrs</th>
                                                    <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Gross Pay</th>
                                                    <th className={`h-10 ${cellX} text-right font-medium text-destructive`}>Deductions</th>
                                                    <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Net Pay</th>
                                                    <th className={`h-10 ${cellX} text-center font-medium text-muted-foreground`}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {filteredPayrollCandidates.map((c, i) => (
                                                    <tr
                                                        key={i}
                                                        className="hover:bg-muted/30 cursor-pointer group"
                                                        onClick={() => setSelectedCandidate(c)}
                                                        title="Click to view details"
                                                    >
                                                        <td className={`${cellX} ${cellY} font-medium flex items-center gap-2 group-hover:text-primary transition-colors`}>
                                                            {c.officer?.full_name}
                                                            <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                                        </td>
                                                        <td className={`${cellX} ${cellY} text-right`}>{c.hours.toFixed(1)}</td>
                                                        <td className={`${cellX} ${cellY} text-right`}>${c.gross_pay.toFixed(2)}</td>
                                                        <td className={`${cellX} ${cellY} text-right text-destructive`}>
                                                            {c.deductions_total > 0 ? `-$${c.deductions_total.toFixed(2)}` : '-'}
                                                        </td>
                                                        <td className={`${cellX} ${cellY} text-right font-mono font-bold`}>${c.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className={`${cellX} ${cellY} text-center`}><Badge variant="outline">Pending</Badge></td>
                                                    </tr>
                                                ))}
                                                {filteredPayrollCandidates.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-10">
                                                            <div className="max-w-md mx-auto rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
                                                                <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/70" />
                                                                {payrollCandidates.length > 0 ? (
                                                                    <>
                                                                        <p className="text-sm font-medium">No officers match your search</p>
                                                                        <p className="text-xs text-muted-foreground mt-1">Try a different officer name or clear search.</p>
                                                                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setPayrollSearch('')}>Clear Search</Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p className="text-sm font-medium">No approved hours in this date range</p>
                                                                        <p className="text-xs text-muted-foreground mt-1">Try a wider payroll period or approve pending time entries.</p>
                                                                        <div className="mt-3 flex items-center justify-center gap-2">
                                                                            <Button variant="outline" size="sm" onClick={() => setPreset(14)}>Last 14 Days</Button>
                                                                            <Button variant="outline" size="sm" onClick={setLastMonth}>Last Month</Button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="mt-8">
                                <h3 className="text-lg font-bold mb-4 tracking-tight">Payroll History</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {payrolls.map(run => (
                                        <div key={run.id} className="border border-border rounded-xl p-5 bg-card shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-sm text-foreground">Period Ending {new Date(run.period_end).toLocaleDateString()}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Processed {new Date(run.processed_at || '').toLocaleDateString()}</p>
                                                </div>
                                                <Badge variant={run.status === 'paid' ? 'success' : 'secondary'} className="capitalize">{run.status}</Badge>
                                            </div>
                                            <div className="mt-auto pt-3 border-t border-border flex justify-between items-center">
                                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" /> {run.officer_count} Officers</span>
                                                <span className="font-bold font-mono text-lg">${run.total_amount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {payrolls.length === 0 && (
                                        <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
                                            <p className="text-sm font-medium">No payroll history yet</p>
                                            <p className="text-xs text-muted-foreground mt-1">Run your first payroll after reviewing approved entries.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* INVOICES TAB */}
                <TabsContent value="invoices" className="space-y-4">
                    <div className="bg-card p-4 rounded-lg border border-border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                                <Input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="Search invoice # or client" />
                            </div>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={invoiceStatusFilter}
                                onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                            </select>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={invoiceSort}
                                onChange={(e) => setInvoiceSort(e.target.value as any)}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="amount_desc">Amount High-Low</option>
                                <option value="amount_asc">Amount Low-High</option>
                            </select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">Showing {filteredInvoices.length} of {invoices.length} invoices</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Unbilled Activity</CardTitle>
                            <p className="text-sm text-muted-foreground">Clients with billable hours ready for invoicing.</p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rounded-none border-t border-border overflow-hidden max-h-[46vh] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                                        <tr>
                                            <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Client</th>
                                            <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Unbilled Hours</th>
                                            <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Rate ($)</th>
                                            <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Est. Amount</th>
                                            <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {clients.map(client => {
                                            // Calc unbilled for this client
                                            const entries = unbilledEntries.filter(e => e.shift?.site?.client_id === client.id);
                                            if (entries.length === 0) return null;

                                            const hrs = entries.reduce((acc, curr) => acc + curr.total_hours, 0);

                                            // Calculate estimated amount respecting potential overrides
                                            const amount = entries.reduce((acc, curr) => {
                                                const r = curr.shift?.bill_rate || client.billing_settings?.standard_rate || 45;
                                                return acc + (curr.total_hours * r);
                                            }, 0);

                                            // Check if rates vary
                                            const defaultRate = client.billing_settings?.standard_rate || 45;
                                            const hasVariedRates = entries.some(e => (e.shift?.bill_rate || defaultRate) !== defaultRate);

                                            return (
                                                <tr key={client.id} className="hover:bg-muted/30">
                                                    <td className={`${cellX} ${cellY} font-medium`}>{client.name}</td>
                                                    <td className={`${cellX} ${cellY} text-right`}>{hrs.toFixed(1)}</td>
                                                    <td className={`${cellX} ${cellY} text-right text-muted-foreground`}>
                                                        {hasVariedRates ? <span className="text-xs italic">Varied</span> : `${defaultRate}/hr`}
                                                    </td>
                                                    <td className={`${cellX} ${cellY} text-right font-mono font-bold`}>${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td className={`${cellX} ${cellY} text-right`}>
                                                        <Button size="sm" variant="outline" onClick={() => handleCreateInvoice(client)}>Generate Invoice</Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {unbilledEntries.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10">
                                                    <div className="max-w-md mx-auto rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
                                                        <p className="text-sm font-medium">All activity is currently billed</p>
                                                        <p className="text-xs text-muted-foreground mt-1">New approved time entries will appear here automatically.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-4 tracking-tight">Invoice History</h3>
                        <div className="rounded-xl border border-border bg-card overflow-hidden max-h-[46vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                                    <tr>
                                        <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Invoice #</th>
                                        <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Client</th>
                                        <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Date</th>
                                        <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Amount</th>
                                        <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-muted/30">
                                            <td className={`${cellX} ${cellY} font-mono text-xs`}>{inv.invoice_number}</td>
                                            <td className={`${cellX} ${cellY} font-medium`}>{inv.client?.name || 'Unknown'}</td>
                                            <td className={`${cellX} ${cellY} text-muted-foreground`}>{new Date(inv.issue_date).toLocaleDateString()}</td>
                                            <td className={`${cellX} ${cellY} text-right font-mono font-bold`}>${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className={`${cellX} ${cellY} text-right`}>
                                                <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">
                                                    {inv.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-10">
                                                <div className="max-w-md mx-auto rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
                                                    {invoices.length === 0 ? (
                                                        <>
                                                            <p className="text-sm font-medium">No invoices created yet</p>
                                                            <p className="text-xs text-muted-foreground mt-1">Generate an invoice from unbilled activity to start your billing history.</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-medium">No invoices match current filters</p>
                                                            <p className="text-xs text-muted-foreground mt-1">Try clearing search or selecting a different status.</p>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="exceptions" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <ExceptionMetricCard
                            label="Open Exceptions"
                            value={exceptionData.summary.total}
                            hint="Items needing accounting review"
                            tone={exceptionData.summary.total > 0 ? 'amber' : 'emerald'}
                        />
                        <ExceptionMetricCard
                            label="High Severity"
                            value={exceptionData.summary.high_severity}
                            hint="Should be cleared before closeout"
                            tone={exceptionData.summary.high_severity > 0 ? 'red' : 'emerald'}
                        />
                        <ExceptionMetricCard
                            label="Payroll Blockers"
                            value={exceptionData.summary.payroll_blockers}
                            hint="Approval, duplicate, or rate issues"
                            tone={exceptionData.summary.payroll_blockers > 0 ? 'amber' : 'emerald'}
                        />
                        <ExceptionMetricCard
                            label="Revenue At Risk"
                            value={`$${exceptionData.summary.revenue_at_risk.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                            hint="Approved work still waiting to invoice"
                            tone={exceptionData.summary.revenue_at_risk > 0 ? 'red' : 'emerald'}
                        />
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <Button variant={exceptionFilter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setExceptionFilter('all')}>All</Button>
                                <Button variant={exceptionFilter === 'high' ? 'secondary' : 'outline'} size="sm" onClick={() => setExceptionFilter('high')}>High Severity</Button>
                                <Button variant={exceptionFilter === 'payroll' ? 'secondary' : 'outline'} size="sm" onClick={() => setExceptionFilter('payroll')}>Payroll</Button>
                                <Button variant={exceptionFilter === 'billing' ? 'secondary' : 'outline'} size="sm" onClick={() => setExceptionFilter('billing')}>Billing</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {exceptionData.type_counts.missing_approval} approvals, {exceptionData.type_counts.duplicate_entry} duplicates, {exceptionData.type_counts.rate_mismatch} rate reviews, {exceptionData.type_counts.unbilled_entry} billing gaps
                            </p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Exception Queue</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">Review payroll blockers and invoice leakage before processing closeout work.</p>
                            </div>
                            <ExceptionSeverityBadge severity={exceptionData.summary.high_severity > 0 ? 'high' : filteredExceptions.length > 0 ? 'medium' : 'low'} />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rounded-none border-t border-border overflow-hidden max-h-[58vh] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                                        <tr>
                                            <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Type</th>
                                            <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Severity</th>
                                            <th className={`h-10 ${cellX} text-left font-medium text-muted-foreground`}>Summary</th>
                                            <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Impact</th>
                                            <th className={`h-10 ${cellX} text-right font-medium text-muted-foreground`}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredExceptions.map((exception) => (
                                            <tr key={exception.id} className="hover:bg-muted/30 align-top">
                                                <td className={`${cellX} ${cellY}`}>
                                                    <div className="font-medium">{formatExceptionType(exception.type)}</div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {exception.entry_count} {exception.entry_count === 1 ? 'entry' : 'entries'}
                                                    </p>
                                                </td>
                                                <td className={`${cellX} ${cellY}`}>
                                                    <ExceptionSeverityBadge severity={exception.severity} />
                                                </td>
                                                <td className={`${cellX} ${cellY}`}>
                                                    <p className="font-medium text-foreground">{exception.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{exception.description}</p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {[exception.officer_name, exception.client_name, exception.site_name].filter(Boolean).join(' • ')}
                                                    </p>
                                                </td>
                                                <td className={`${cellX} ${cellY} text-right`}>
                                                    {exception.hours != null && (
                                                        <p className="font-semibold">{exception.hours.toFixed(1)} hrs</p>
                                                    )}
                                                    {exception.amount != null && (
                                                        <p className="text-xs text-muted-foreground mt-1">${exception.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    )}
                                                </td>
                                                <td className={`${cellX} ${cellY} text-right`}>
                                                    {exception.action === 'review' ? (
                                                        <span className="text-xs text-muted-foreground font-medium">{formatExceptionAction(exception)}</span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleExceptionAction(exception)}
                                                            disabled={exceptionActionId === exception.id}
                                                        >
                                                            {exceptionActionId === exception.id ? 'Working...' : formatExceptionAction(exception)}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredExceptions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10">
                                                    <div className="max-w-md mx-auto rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
                                                        <p className="text-sm font-medium">Exception queue is clear</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Current approved work is linked cleanly for billing and payroll.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODAL: Process Payroll */}
                <Dialog open={isProcessPayrollOpen} onOpenChange={setIsProcessPayrollOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Payroll Run</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md text-sm mb-2 border border-blue-100 dark:border-blue-800">
                                Processing period: <strong>{new Date(payPeriodStart).toLocaleDateString()}</strong> - <strong>{new Date(payPeriodEnd).toLocaleDateString()}</strong>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center border border-border">
                                <span className="text-sm font-medium">Total Net Pay</span>
                                <span className="font-bold text-lg">${payrollCandidates.reduce((acc, curr) => acc + curr.net_pay, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center border border-border">
                                <span className="text-sm font-medium">Employees</span>
                                <span className="font-bold">{payrollCandidates.length} Officers</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                This will create a payroll record and mark associated time entries as paid.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsProcessPayrollOpen(false)}>Cancel</Button>
                            <Button onClick={handleRunPayroll} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Process Payment</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* MODAL: Invoice Preview */}
                <Dialog open={!!invoicePreview} onOpenChange={(o) => !o && setInvoicePreview(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>New Invoice: {invoicePreview?.client?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-6">
                            <div className="flex justify-between border-b border-border pb-4">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
                                    <p className="font-bold text-lg">{invoicePreview?.client?.name}</p>
                                    <p className="text-sm text-muted-foreground">{invoicePreview?.client?.address}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Details</p>
                                    <p className="text-sm">Issue: {new Date().toLocaleDateString()}</p>
                                    <p className="text-sm">Due: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                                        <th className="text-right py-2 font-medium text-muted-foreground">Qty</th>
                                        <th className="text-right py-2 font-medium text-muted-foreground">Rate</th>
                                        <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {invoicePreview?.items?.map((item: any, i: number) => (
                                        <tr key={i}>
                                            <td className="py-3">{item.description}</td>
                                            <td className="text-right py-3">{item.quantity.toFixed(1)}</td>
                                            <td className="text-right py-3">${item.rate}</td>
                                            <td className="text-right py-3 font-medium">${item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end pt-4 border-t border-border">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Due</p>
                                    <p className="text-3xl font-bold mt-1 text-foreground">${invoicePreview?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setInvoicePreview(null)}>Cancel</Button>
                            <Button onClick={confirmInvoice} className="gap-2"><Send className="h-4 w-4" /> Send Invoice</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Tabs>
    );
}
