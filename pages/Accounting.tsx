
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Avatar } from '../components/ui';
import { db } from '../lib/db';
import { PayrollRun, Invoice, Client } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, CreditCard, TrendingUp, Download, Briefcase, CheckCircle2, AlertCircle, Plus, FileText, Send, Calendar, Filter, Eye, ArrowLeft } from 'lucide-react';

export default function Accounting() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]); // Invoices with Client populated
  const [clients, setClients] = useState<Client[]>([]);
  const [unbilledEntries, setUnbilledEntries] = useState<any[]>([]);
  
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [payRes, invRes, timeRes, clientRes] = await Promise.all([
      db.payrolls.select(),
      db.getFullInvoices(),
      db.getFullTimeEntries(),
      db.clients.select()
    ]);

    setPayrolls(payRes.data || []);
    setInvoices(invRes.data || []);
    setClients(clientRes.data || []);
    setRawTimeEntries(timeRes.data || []);

    // Logic: Unbilled Time Entries (Mock logic: entries in last 30 days not flagged as invoiced)
    const allEntries = timeRes.data || [];
    const unbilled = allEntries.filter(e => e.status === 'approved' && Math.random() > 0.6);
    setUnbilledEntries(unbilled);
    
    setIsLoading(false);
  };

  // Recalculate Payroll Candidates when dates or raw data change
  useEffect(() => {
      if (rawTimeEntries.length === 0) return;

      const startDate = new Date(payPeriodStart);
      const endDate = new Date(payPeriodEnd);
      endDate.setHours(23, 59, 59, 999); // Include full end day

      const candidates = rawTimeEntries.filter(e => {
        const entryDate = new Date(e.clock_in);
        return e.status === 'approved' && 
               entryDate >= startDate && 
               entryDate <= endDate;
      });
      
      // Group candidates by Officer
      const officerMap = new Map();
      candidates.forEach((e: any) => {
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
  }, [rawTimeEntries, payPeriodStart, payPeriodEnd]);

  // --- ACTIONS ---

  const handleCreateInvoice = async (client: Client) => {
    // Filter unbilled entries for this client
    const clientEntries = unbilledEntries.filter(e => e.shift?.site?.client_id === client.id);
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
      items: items
    };

    // Optimistic UI
    setInvoicePreview({ ...newInvoice, client });
  };

  const confirmInvoice = async () => {
    if (!invoicePreview) return;
    
    const res = await db.invoices.create({
        client_id: invoicePreview.client_id,
        invoice_number: invoicePreview.invoice_number,
        issue_date: invoicePreview.issue_date,
        due_date: invoicePreview.due_date,
        amount: invoicePreview.amount,
        status: 'sent', // Auto send
        items: invoicePreview.items
    });

    // Audit Log
    db.audit_logs.create({
        action: 'create',
        description: `Generated Invoice #${invoicePreview.invoice_number} for ${invoicePreview.client.name}`,
        performed_by: profile?.full_name || 'System',
        performed_by_id: profile?.id || 'system',
        target_resource: 'Invoice',
        target_id: res.data?.id,
        timestamp: new Date().toISOString()
    });

    setInvoicePreview(null);
    loadData(); // Refresh
  };

  const handleRunPayroll = async () => {
     const total = payrollCandidates.reduce((acc, curr) => acc + curr.net_pay, 0);
     const count = payrollCandidates.length;

     const res = await db.payrolls.create({
        period_start: new Date(payPeriodStart).toISOString(),
        period_end: new Date(payPeriodEnd).toISOString(),
        total_amount: total,
        status: 'paid',
        officer_count: count,
        processed_at: new Date().toISOString()
     });

     // Audit Log
     db.audit_logs.create({
        action: 'process',
        description: `Processed Payroll for ${count} officers. Total: $${total.toFixed(2)}`,
        performed_by: profile?.full_name || 'System',
        performed_by_id: profile?.id || 'system',
        target_resource: 'Payroll',
        target_id: res.data?.id,
        timestamp: new Date().toISOString()
     });

     setIsProcessPayrollOpen(false);
     loadData();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Accounting & Finance</h2>
          <p className="text-sm text-muted-foreground">Manage payroll, billing, and financial health.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export Ledger
            </Button>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (YTD)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
           </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payroll Cost (YTD)</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
              <div className="text-2xl font-bold">${totalPayroll.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Stable</p>
           </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
           </CardHeader>
           <CardContent>
              <div className={`text-2xl font-bold ${netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${netMargin.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">~{(totalRevenue > 0 ? (netMargin/totalRevenue * 100).toFixed(1) : 0)}% margin</p>
           </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-600" />
           </CardHeader>
           <CardContent>
              <div className="text-2xl font-bold">{outstandingInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
           </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payroll" className="space-y-4">
         <TabsList>
            <TabsTrigger value="payroll" className="gap-2"><Briefcase className="h-4 w-4" /> Payroll</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2"><FileText className="h-4 w-4" /> Invoices</TabsTrigger>
         </TabsList>

         {/* PAYROLL TAB */}
         <TabsContent value="payroll" className="space-y-4">
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
                                          <span className="text-emerald-600 dark:text-emerald-400">${selectedCandidate.net_pay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
                                               <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                                               <th className="px-4 py-3 text-left font-medium text-muted-foreground">Site</th>
                                               <th className="px-4 py-3 text-right font-medium text-muted-foreground">Hours</th>
                                               <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                                               <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y">
                                           {selectedCandidate.entries.map((e: any, i: number) => (
                                               <tr key={i} className="hover:bg-muted/10">
                                                   <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                       {new Date(e.clock_in).toLocaleDateString()}
                                                       <div className="text-xs text-muted-foreground font-normal">
                                                           {new Date(e.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                                                           {e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Active'}
                                                       </div>
                                                   </td>
                                                   <td className="px-4 py-3">{e.shift?.site?.name}</td>
                                                   <td className="px-4 py-3 text-right">
                                                       <div>{e.calculated_reg.toFixed(1)} <span className="text-xs text-muted-foreground">reg</span></div>
                                                       {e.calculated_ot > 0 && <div className="text-amber-600 font-semibold">{e.calculated_ot.toFixed(1)} <span className="text-xs text-amber-600/70">ot</span></div>}
                                                   </td>
                                                   <td className="px-4 py-3 text-right">
                                                       <div>${e.applied_base_rate}</div>
                                                       {e.calculated_ot > 0 && <div className="text-xs text-muted-foreground">${e.applied_ot_rate} (OT)</div>}
                                                   </td>
                                                   <td className="px-4 py-3 text-right font-mono font-medium">
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
                         <Button variant="outline" size="sm" onClick={() => setPreset(7)} className="flex-1 sm:flex-none">Last 7 Days</Button>
                         <Button variant="outline" size="sm" onClick={() => setPreset(14)} className="flex-1 sm:flex-none">Last 14 Days</Button>
                         <Button variant="outline" size="sm" onClick={setLastMonth} className="flex-1 sm:flex-none">Last Month</Button>
                    </div>
                </div>
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
                    <div className="rounded-none border-t border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Officer</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Total Hrs</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Gross Pay</th>
                                    <th className="h-10 px-6 text-right font-medium text-destructive">Deductions</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Net Pay</th>
                                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {payrollCandidates.map((c, i) => (
                                    <tr 
                                      key={i} 
                                      className="hover:bg-muted/30 cursor-pointer group"
                                      onClick={() => setSelectedCandidate(c)}
                                      title="Click to view details"
                                    >
                                        <td className="px-6 py-4 font-medium flex items-center gap-2 group-hover:text-primary transition-colors">
                                            {c.officer?.full_name}
                                            <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                        </td>
                                        <td className="px-6 py-4 text-right">{c.hours.toFixed(1)}</td>
                                        <td className="px-6 py-4 text-right">${c.gross_pay.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-destructive">
                                            {c.deductions_total > 0 ? `-$${c.deductions_total.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">${c.net_pay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-6 py-4 text-center"><Badge variant="outline">Pending</Badge></td>
                                    </tr>
                                ))}
                                {payrollCandidates.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No approved hours found for this period. Check your filters or ensure time entries are approved.</td></tr>
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
                 </div>
             </div>
             </>
             )}
         </TabsContent>

         {/* INVOICES TAB */}
         <TabsContent value="invoices" className="space-y-4">
             <Card>
                <CardHeader>
                   <CardTitle>Unbilled Activity</CardTitle>
                   <p className="text-sm text-muted-foreground">Clients with billable hours ready for invoicing.</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-none border-t border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Client</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Unbilled Hours</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Rate ($)</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Est. Amount</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Action</th>
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
                                            <td className="px-6 py-4 font-medium">{client.name}</td>
                                            <td className="px-6 py-4 text-right">{hrs.toFixed(1)}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">
                                                {hasVariedRates ? <span className="text-xs italic">Varied</span> : `${defaultRate}/hr`}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold">${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="outline" onClick={() => handleCreateInvoice(client)}>Generate Invoice</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {unbilledEntries.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">All activity has been billed.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
             </Card>

             <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 tracking-tight">Invoice History</h3>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="h-10 px-6 text-left font-medium text-muted-foreground">Invoice #</th>
                                <th className="h-10 px-6 text-left font-medium text-muted-foreground">Client</th>
                                <th className="h-10 px-6 text-left font-medium text-muted-foreground">Date</th>
                                <th className="h-10 px-6 text-right font-medium text-muted-foreground">Amount</th>
                                <th className="h-10 px-6 text-right font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-muted/30">
                                    <td className="px-6 py-4 font-mono text-xs">{inv.invoice_number}</td>
                                    <td className="px-6 py-4 font-medium">{inv.client?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold">${inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">
                                            {inv.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
         </TabsContent>
      </Tabs>

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
                      <span className="font-bold text-lg">${payrollCandidates.reduce((acc, curr) => acc + curr.net_pay, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
                          <p className="text-sm">Due: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
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
                         <p className="text-3xl font-bold mt-1 text-foreground">${invoicePreview?.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
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
  );
}
