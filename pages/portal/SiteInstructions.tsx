import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import {
    BookOpen, FileText, Download, Building2, MapPin,
    Shield, CheckCircle2, AlertCircle, Info, ChevronRight,
    Search, Filter, ExternalLink
} from 'lucide-react';

export function SiteInstructions() {
    const { organization, client } = useClientPortalAuth();
    const [activeSiteId, setActiveSiteId] = useState<string | null>(null);

    // Mock Sites & Documents
    const sites = [
        {
            id: 'SITE-001',
            name: 'Corporate Headquarters',
            address: '123 Business Way, San Francisco, CA',
            status: 'active',
            documents: [
                { name: 'Standard Post Orders', type: 'PDF', version: '2.4', date: '2024-01-15' },
                { name: 'Emergency Evacuation Plan', type: 'PDF', version: '1.2', date: '2023-11-20' },
                { name: 'Access Control Protocol', type: 'PDF', version: '3.0', date: '2024-03-05' }
            ]
        },
        {
            id: 'SITE-002',
            name: 'Westside Logistics Hub',
            address: '456 Distribution Ln, Oakland, CA',
            status: 'active',
            documents: [
                { name: 'Gate Entry Instructions', type: 'PDF', version: '1.0', date: '2024-02-10' },
                { name: 'Hazardous Materials Policy', type: 'PDF', version: '2.1', date: '2024-04-12' }
            ]
        }
    ];

    if (activeSiteId === null && sites.length > 0) {
        setActiveSiteId(sites[0].id);
    }

    const currentSite = sites.find(s => s.id === activeSiteId) || sites[0];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Site Instructions</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Review post orders, protocols, and standard operating procedures for your sites.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Site List */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Your Locations</h3>
                    {sites.map((site) => (
                        <button
                            key={site.id}
                            onClick={() => setActiveSiteId(site.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${activeSiteId === site.id
                                ? 'bg-slate-900 text-white shadow-xl translate-x-1 border-slate-900'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-xl ${activeSiteId === site.id ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <Building2 className={`h-5 w-5 ${activeSiteId === site.id ? 'text-white' : 'text-slate-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold truncate">{site.name}</h4>
                                    <p className={`text-xs mt-1 truncate ${activeSiteId === site.id ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {site.address}
                                    </p>
                                </div>
                                <ChevronRight className={`h-4 w-4 mt-1 transition-transform ${activeSiteId === site.id ? 'rotate-90' : ''}`} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Right: Site Details & Documents */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Site Banner */}
                    <div className="relative h-48 rounded-3xl overflow-hidden shadow-2xl group">
                        <img
                            src={`https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200`}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt="Site"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-8 text-white">
                            <Badge className="mb-3 bg-emerald-500 hover:bg-emerald-600 text-white border-0">Fully Validated</Badge>
                            <h2 className="text-3xl font-bold">{currentSite.name}</h2>
                            <div className="flex items-center gap-2 mt-2 text-slate-300">
                                <MapPin className="h-4 w-4" />
                                <span className="text-sm">{currentSite.address}</span>
                            </div>
                        </div>
                    </div>

                    {/* Document List */}
                    <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/50 p-6">
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <BookOpen className="h-5 w-5 text-blue-500" />
                                Post Orders & Protocols
                            </CardTitle>
                            <Button size="sm" variant="ghost" className="text-xs text-blue-500">
                                View All History
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {currentSite.documents.map((doc, i) => (
                                    <div key={i} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{doc.name}</h4>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                                    <span>v{doc.version}</span>
                                                    <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                                                    <span>{doc.type}</span>
                                                    <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                                                    <span>Updated {doc.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="icon" variant="ghost" className="rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                                <Download className="h-5 w-5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="rounded-xl">
                                                <ExternalLink className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Site Activity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-slate-50 dark:bg-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none">
                            <CardContent className="p-6 flex flex-col items-center text-center">
                                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Need to update instructions?</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                    Submit a request to update site-specific protocols or post orders.
                                </p>
                                <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 px-6 text-xs">
                                    Submit Update Request
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 text-white border-0 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white/5 rounded-full blur-2xl" />
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="h-5 w-5 text-blue-400" />
                                    <span className="text-sm font-bold uppercase tracking-wider">Compliance Status</span>
                                </div>
                                <h3 className="text-2xl font-bold">Officer Validation</h3>
                                <p className="text-slate-400 mt-2 text-sm">
                                    All officers assigned to this site have acknowledged and signed the latest post orders.
                                </p>
                                <div className="mt-6 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[100%]" />
                                </div>
                                <p className="text-[10px] mt-2 text-slate-500 text-right">100% COMPLIANCE</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
