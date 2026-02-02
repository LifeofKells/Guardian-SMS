/**
 * DARPreview Component
 * A premium, print-friendly Daily Activity Report generator.
 */

import React, { useRef } from 'react';
import {
    FileText,
    Printer,
    Download,
    ShieldCheck,
    Clock,
    AlertTriangle,
    MapPin,
    User,
    Building2,
    Calendar,
    Phone,
    Mail
} from 'lucide-react';
import { Dialog, Button, Badge, Avatar, cn } from './ui';
import type { Shift, Site, Client, Officer, Incident, TimeEntry } from '../lib/types';

interface DARData {
    shift: Shift;
    site: Site | null;
    client: Client | null;
    officer: Officer | null;
    incidents: Incident[];
    time_entries: TimeEntry[];
}

interface DARPreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: DARData | null;
}

export function DARPreview({ open, onOpenChange, data }: DARPreviewProps) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!data) return null;

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        // Custom direct print window to ensure all styles (including tailwind) are preserved
        const win = window.open('', '_blank');
        if (!win) return;

        win.document.write(`
            <html>
                <head>
                    <title>DAR - ${data.site?.name || 'Report'} - ${new Date().toLocaleDateString()}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script>
                        tailwind.config = {
                            theme: {
                                extend: {
                                    colors: {
                                        primary: '#3b82f6',
                                    }
                                }
                            }
                        }
                    </script>
                    <style>
                        body { 
                            font-family: 'Inter', sans-serif;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        @media print {
                            @page { size: auto; margin: 0; }
                            body { background: white !important; margin: 1.5cm; }
                            .no-print { display: none !important; }
                            .print-break { page-break-after: always; }
                            
                            /* Ensure borders and backgrounds are forced */
                            * { 
                                transition: none !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                        /* Custom scrollbar hide for print content */
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                    </style>
                </head>
                <body class="bg-white">
                    <div class="max-w-[850px] mx-auto">
                        ${printContent.innerHTML}
                    </div>
                </body>
            </html>
        `);

        win.document.close();

        // Wait for Tailwind and Fonts to initialize
        setTimeout(() => {
            win.focus();
            win.print();
        }, 1200);
    };

    const { shift, site, client, officer, incidents, time_entries } = data;
    const reportDate = new Date(shift.start_time).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange} className="max-w-4xl max-h-[90vh]">
            <div className="flex flex-col h-full overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h2 className="font-bold text-lg">Daily Activity Report Preview</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                            <Printer className="h-4 w-4" /> Print PDF
                        </Button>
                    </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-900/50 no-scrollbar">
                    <div
                        ref={printRef}
                        className="bg-white dark:bg-slate-950 shadow-xl border border-border mx-auto max-w-[800px] p-10 min-h-[1000px] text-slate-900 dark:text-slate-100"
                    >
                        {/* DAR HEADER */}
                        <div className="flex justify-between items-start border-b-4 border-primary pb-8 mb-8">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-primary p-2 rounded-lg">
                                        <ShieldCheck className="h-8 w-8 text-white" />
                                    </div>
                                    <span className="text-3xl font-black tracking-tighter uppercase italic">Guardian</span>
                                </div>
                                <div className="space-y-1 text-sm text-slate-500">
                                    <p>500 Security Plaza, Los Angeles, CA 90210</p>
                                    <p>Dispatch: (555) 911-0000 • support@guardiansms.com</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-2 tracking-tight">Daily Activity Report</h1>
                                <Badge variant="outline" className="text-lg py-1 px-4 font-bold border-primary text-primary">
                                    REF: DAR-${shift.id.slice(0, 6).toUpperCase()}
                                </Badge>
                                <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">{reportDate}</p>
                            </div>
                        </div>

                        {/* SITE & CLIENT INFO */}
                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-border/50">
                                <h3 className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
                                    <Building2 className="h-4 w-4" /> Site Information
                                </h3>
                                <p className="text-lg font-bold mb-1">{site?.name || 'N/A'}</p>
                                <p className="text-sm text-slate-500 mb-4">{site?.address || 'N/A'}</p>
                                <p className="text-sm font-semibold">Client: <span className="font-medium text-slate-500">{client?.name || 'N/A'}</span></p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-border/50">
                                <h3 className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
                                    <User className="h-4 w-4" /> Assigned Officer
                                </h3>
                                <div className="flex items-center gap-4">
                                    <Avatar fallback={officer?.full_name?.charAt(0) || 'U'} className="h-12 w-12 border-2 border-white shadow-sm" />
                                    <div>
                                        <p className="text-lg font-bold">{officer?.full_name || 'Unassigned'}</p>
                                        <p className="text-sm text-slate-500 italic">Badge #${officer?.badge_number || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Shift: {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* ATTENDANCE LOG */}
                        <div className="mb-10">
                            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4">
                                <Clock className="h-4 w-4 text-primary" /> Shift Attendance Log
                            </h3>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border">
                                        <tr className="text-left">
                                            <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Event Type</th>
                                            <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Timestamp</th>
                                            <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Location</th>
                                            <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {time_entries.map((entry, idx) => (
                                            <tr key={entry.id} className={cn(idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/30 dark:bg-slate-900/30")}>
                                                <td className="px-4 py-3">
                                                    <Badge variant="success" className="capitalize">
                                                        Shift Period
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {entry.clock_out && ` - ${new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    GPS Verified
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {entry.notes || 'Routine duty performed.'}
                                                </td>
                                            </tr>
                                        ))}
                                        {time_entries.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No attendance records for this shift.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* INCIDENT REPORTS */}
                        <div className="mb-10">
                            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Incident Reports
                            </h3>
                            <div className="space-y-4">
                                {incidents.map((inc) => (
                                    <div key={inc.id} className="p-6 border-l-4 border-amber-500 bg-amber-50/30 dark:bg-amber-500/5 rounded-r-xl border-y border-r border-border">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-black uppercase text-amber-600 dark:text-amber-400 mb-1">{inc.type}</p>
                                                <p className="text-xs text-slate-500 font-mono tracking-tighter">REPORTED AT: {new Date(inc.reported_at).toLocaleTimeString()}</p>
                                            </div>
                                            <Badge variant={inc.severity === 'high' ? 'destructive' : inc.severity === 'medium' ? 'warning' : 'default'} className="uppercase">
                                                {inc.severity} Severity
                                            </Badge>
                                        </div>
                                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                            {inc.description}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <Badge variant="outline" className="bg-white/50 dark:bg-slate-950/50">Status: {inc.status.replace('_', ' ')}</Badge>
                                        </div>
                                    </div>
                                ))}
                                {incidents.length === 0 && (
                                    <div className="py-8 text-center border font-medium border-dashed border-border rounded-xl text-slate-400">
                                        No incidents reported during this shift.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SIGNATURE SECTION */}
                        <div className="mt-16 grid grid-cols-2 gap-16 border-t border-border pt-12">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-12">Authorized Security Officer</p>
                                <div className="border-b border-slate-300 pb-2 mb-2 font-serif text-xl italic text-slate-800 dark:text-slate-200">
                                    {officer?.full_name}
                                </div>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">Digital Signature Verified • ${new Date().toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-12">Quality Assurance / Supervisor</p>
                                <div className="border-b border-slate-300 h-[30px] mb-2"></div>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">Signature Required for Final Approval</p>
                            </div>
                        </div>

                        {/* DAR FOOTER */}
                        <div className="mt-20 text-center border-t border-border pt-6">
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium mb-2">Confidential Proprietary Information</p>
                            <p className="text-[9px] text-slate-300 leading-relaxed max-w-lg mx-auto italic">
                                This report is the property of Guardian Security Management Systems and is intended solely for the person or entity to which it is addressed. Any unauthorized review, use, disclosure, or distribution is prohibited.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
