import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import {
    Shield, Search, Download, FileText, ChevronRight, CheckCircle2,
    AlertTriangle, ShieldCheck, Video, ShieldAlert, User, Bell
} from 'lucide-react';

export function SiteInstructions() {
    const { organization, client } = useClientPortalAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSiteId, setActiveSiteId] = useState<string>('SITE-001');

    // Site locations roster from Stitch design
    const sites = [
        {
            id: 'SITE-001',
            name: 'Warehouse-A Sector 7',
            status: 'Active',
            statusColor: 'emerald',
            compliance: '98.5%',
            complianceColor: 'text-emerald-400',
            activeGuards: '12 / 14',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
            updated: '0800 HRS',
            description: 'Standard Operating Procedures and Post Orders for automated tracking and perimeter defense protocols. Level 4 Clearance required for physical modifications.',
            documents: [
                { id: 'doc-1', title: 'Perimeter Sweep Protocol v4.2', size: '2.4 MB', updated: 'Updated 2 days ago' },
                { id: 'doc-2', title: 'Access Control & Badging Matrix', size: '1.1 MB', updated: 'Updated 1 week ago' },
                { id: 'doc-3', title: 'Incident Escalation Hierarchy', size: '850 KB', updated: 'Updated 1 month ago' },
            ],
            signOffRate: '85%',
            signOffGuards: [
                { name: 'Opr. Jenkins', status: 'signed', avatar: 'MJ' },
                { name: 'Opr. Wallace', status: 'signed', avatar: 'MW' },
                { name: 'Opr. Torres', status: 'pending', avatar: 'RT' },
            ],
            activeFeeds: 42,
            breaches: 0
        },
        {
            id: 'SITE-002',
            name: 'HQ-East Campus',
            status: 'Active',
            statusColor: 'emerald',
            compliance: '100%',
            complianceColor: 'text-blue-400',
            activeGuards: '24 / 24',
            image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200',
            updated: '0600 HRS',
            description: 'Executive tower and visitor center access rules. Biometric logging mandatory for server rooms.',
            documents: [
                { id: 'doc-4', title: 'Executive Visitor Access & Keycard Protocol', size: '1.8 MB', updated: 'Updated yesterday' },
                { id: 'doc-5', title: 'Main Lobby Patrol Route & Egress Map', size: '3.2 MB', updated: 'Updated 4 days ago' },
            ],
            signOffRate: '100%',
            signOffGuards: [
                { name: 'Opr. Johnson', status: 'signed', avatar: 'JJ' },
                { name: 'Opr. Davis', status: 'signed', avatar: 'RD' },
            ],
            activeFeeds: 64,
            breaches: 0
        },
        {
            id: 'SITE-003',
            name: 'Data Center Bravo',
            status: 'Review',
            statusColor: 'amber',
            compliance: '82.1%',
            complianceColor: 'text-amber-400',
            activeGuards: '6 / 8',
            image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200',
            updated: '1200 HRS',
            description: 'Critical infrastructure biometric security. High security post orders pending supervisor review.',
            documents: [
                { id: 'doc-6', title: 'High Density Server Hall Lockdown Protocol', size: '4.5 MB', updated: 'Updated 3 weeks ago' }
            ],
            signOffRate: '75%',
            signOffGuards: [
                { name: 'Opr. Miller', status: 'signed', avatar: 'SM' },
                { name: 'Opr. Vance', status: 'pending', avatar: 'AV' },
            ],
            activeFeeds: 36,
            breaches: 0
        },
        {
            id: 'SITE-004',
            name: 'Logistics Hub Omega',
            status: 'Active',
            statusColor: 'emerald',
            compliance: '94.0%',
            complianceColor: 'text-emerald-400',
            activeGuards: '18 / 20',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
            updated: '0700 HRS',
            description: 'Freight loading terminal entry and commercial vehicle security scanning procedures.',
            documents: [
                { id: 'doc-7', title: 'Freight Terminal Entry & Vehicle Inspection', size: '3.1 MB', updated: 'Updated 5 days ago' }
            ],
            signOffRate: '90%',
            signOffGuards: [
                { name: 'Opr. Williams', status: 'signed', avatar: 'SW' },
            ],
            activeFeeds: 28,
            breaches: 0
        }
    ];

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeSite = sites.find(s => s.id === activeSiteId) || sites[0];

    const handleDownloadAll = () => {
        alert(`Downloading operational directives package for ${activeSite.name}...`);
    };

    const handleDispatchOverride = () => {
        alert(`Emergency Dispatch Override triggered for ${activeSite.name}. Operations Supervisor notified.`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 lg:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                GUARDIAN INTELLIGENCE HUB
                            </span>
                            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                Live Monitoring Active
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                            Site Post <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Instructions & SOPs</span>
                        </h1>
                        <p className="text-sm text-slate-300 max-w-xl">
                            Access binding post orders, perimeter defense directives, and real-time officer digital sign-off compliance.
                        </p>
                    </div>

                    <button
                        onClick={handleDispatchOverride}
                        className="px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-900 text-white font-black text-xs uppercase tracking-wider border border-rose-500/40 shadow-xl shadow-rose-900/30 hover:border-rose-400 hover:shadow-rose-600/50 transition-all active:scale-95 flex items-center gap-3 shrink-0"
                    >
                        <ShieldAlert className="h-5 w-5 text-rose-400 animate-pulse" />
                        Dispatch Override
                    </button>
                </div>
            </div>

            {/* Split Screen Roster & SOP View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sidebar: Location Roster */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-white">Location Roster</h2>
                            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                                {sites.length} Active Sites
                            </span>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter sites..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            {filteredSites.map((site) => {
                                const isSelected = activeSiteId === site.id;
                                return (
                                    <div
                                        key={site.id}
                                        onClick={() => setActiveSiteId(site.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isSelected
                                                ? 'bg-slate-900 border-blue-500/50 text-white shadow-lg shadow-blue-500/10'
                                                : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-cyan-400 shadow-[0_0_10px_#3b82f6]" />
                                        )}

                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-sm text-white">{site.name}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${site.status === 'Review'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}>
                                                {site.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-[11px]">
                                            <div>
                                                <span className="text-slate-500 text-[10px] block mb-0.5">COMPLIANCE</span>
                                                <span className={`font-bold ${site.complianceColor}`}>{site.compliance}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 text-[10px] block mb-0.5">ACTIVE GUARDS</span>
                                                <span className="text-slate-300">{site.activeGuards}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Hero Site Banner */}
                    <div className="relative h-64 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                        <img
                            src={activeSite.image}
                            alt={activeSite.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />

                        <div className="absolute bottom-0 left-0 p-6 lg:p-8 text-white space-y-3 z-10 w-full">
                            <div className="flex items-center gap-3">
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    POST ORDERS VERIFIED
                                </span>
                                <span className="text-slate-400 font-mono text-xs">Updated: {activeSite.updated}</span>
                            </div>

                            <h2 className="text-2xl lg:text-3xl font-black text-white">{activeSite.name}</h2>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                                {activeSite.description}
                            </p>
                        </div>
                    </div>

                    {/* Operational Directives & Sign-off Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Directives Documents */}
                        <div className="lg:col-span-7 bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2.5">
                                    <FileText className="h-5 w-5 text-blue-400" />
                                    <h3 className="text-base font-bold text-white">Operational Directives</h3>
                                </div>
                                <button
                                    onClick={handleDownloadAll}
                                    className="text-xs font-mono text-blue-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download All
                                </button>
                            </div>

                            <div className="space-y-3">
                                {activeSite.documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="p-4 rounded-2xl bg-slate-950 border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group cursor-pointer"
                                        onClick={() => alert(`Simulated Download: ${doc.title}`)}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-slate-900 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors">
                                                    {doc.title}
                                                </h4>
                                                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                    PDF • {doc.size} • {doc.updated}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shift Sign-off & Bento Stats */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Sign-off Card */}
                            <div className="bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-xl border-t-2 border-t-emerald-400">
                                <div>
                                    <h3 className="text-base font-bold text-white">Shift Acknowledgment</h3>
                                    <p className="text-xs text-slate-400">Guard compliance against active post orders.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between font-mono text-xs">
                                        <span className="text-slate-400">SIGN-OFF RATE</span>
                                        <span className="text-emerald-400 font-bold">{activeSite.signOffRate}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                            style={{ width: activeSite.signOffRate }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    {activeSite.signOffGuards.map((guard, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 text-white">
                                                <div className="h-7 w-7 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center font-mono text-[10px] text-blue-400 font-bold">
                                                    {guard.avatar}
                                                </div>
                                                <span className="font-mono">{guard.name}</span>
                                            </div>
                                            {guard.status === 'signed' ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Pending</span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => alert(`Pending guards pinged for ${activeSite.name}`)}
                                    className="w-full py-2.5 rounded-xl border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider hover:bg-blue-500/10 transition-colors"
                                >
                                    Ping Pending Guards
                                </button>
                            </div>

                            {/* Quick Stats Bento */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/90 rounded-2xl border border-white/[0.08] p-4 text-center space-y-1">
                                    <Video className="h-6 w-6 text-cyan-400 mx-auto mb-1" />
                                    <div className="text-2xl font-black text-white">{activeSite.activeFeeds}</div>
                                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Active Feeds</div>
                                </div>
                                <div className="bg-slate-900/90 rounded-2xl border border-white/[0.08] p-4 text-center space-y-1">
                                    <ShieldCheck className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                                    <div className="text-2xl font-black text-white">{activeSite.breaches}</div>
                                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Breaches (24h)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


