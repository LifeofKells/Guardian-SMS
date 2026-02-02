/**
 * BreadcrumbTrail Component
 * Visualizes the GPS path taken by an officer during a shift.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import { MapPin, Navigation, Clock, Shield, Loader2, X, Activity } from 'lucide-react';
import { Dialog, Badge, cn } from './ui';

interface BreadcrumbTrailProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    officerId: string;
    officerName: string;
}

export function BreadcrumbTrail({ open, onOpenChange, officerId, officerName }: BreadcrumbTrailProps) {
    const { data: breadcrumbs = [], isLoading } = useQuery({
        queryKey: ['breadcrumbs', officerId],
        queryFn: async () => {
            const { data } = await db.getOfficerBreadcrumbs(officerId, 30);
            return data || [];
        },
        enabled: open && !!officerId
    });

    // Mock coordinate mapping to fit a stylized map visual
    const points = useMemo(() => {
        if (breadcrumbs.length === 0) return [];

        // Normalize coordinates to a 0-100 range for SVG drawing
        const lats = breadcrumbs.map(b => b.lat);
        const lngs = breadcrumbs.map(b => b.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latRange = maxLat - minLat || 0.002;
        const lngRange = maxLng - minLng || 0.002;

        return breadcrumbs.map(b => ({
            x: ((b.lng - minLng) / lngRange) * 70 + 15, // 15% padding
            y: 85 - (((b.lat - minLat) / latRange) * 70), // Inverted Y
            timestamp: b.timestamp
        }));
    }, [breadcrumbs]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl overflow-hidden p-0 border-none shadow-2xl">
            <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Navigation className="h-4 w-4 text-blue-400" />
                        </div>
                        <h2 className="font-bold text-slate-100 text-sm tracking-tight">GPS BREADCRUMB TRAIL: {officerName.toUpperCase()}</h2>
                    </div>
                </div>

                <div className="p-6 bg-slate-900">
                    {/* Visual Trail Map */}
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner mb-6 group">
                        {/* Map Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03]"
                            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                        {/* Mock Map Shapes (Simplified Buildings) */}
                        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
                            <rect x="10" y="20" width="15" height="15" fill="white" rx="2" />
                            <rect x="35" y="15" width="20" height="25" fill="white" rx="2" />
                            <rect x="70" y="30" width="20" height="15" fill="white" rx="2" />
                            <rect x="20" y="60" width="30" height="20" fill="white" rx="2" />
                            <rect x="65" y="65" width="15" height="15" fill="white" rx="2" />
                        </svg>

                        {/* SVG Trail */}
                        {points.length > 0 && (
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                                {/* The Path Line */}
                                <polyline
                                    points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="0.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="2 1"
                                    className="drop-shadow-[0_0_4px_rgba(59,130,246,0.8)]"
                                />

                                {/* Connection Dots */}
                                {points.map((p, i) => (
                                    <g key={i}>
                                        <circle
                                            cx={p.x}
                                            cy={p.y}
                                            r={i === points.length - 1 ? 1.5 : 0.6}
                                            fill={i === points.length - 1 ? "#ef4444" : "#60a5fa"}
                                        />
                                        {i === points.length - 1 && (
                                            <circle
                                                cx={p.x}
                                                cy={p.y}
                                                r={3}
                                                fill="none"
                                                stroke="#ef4444"
                                                strokeWidth="0.3"
                                                className="animate-ping"
                                            />
                                        )}
                                    </g>
                                ))}
                            </svg>
                        )}

                        {/* Map UI Overlay */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                            <Badge className="bg-slate-900/80 backdrop-blur-md border-slate-700 text-blue-400 gap-1.5 py-1 text-[10px] font-mono">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> SATELLITE_LOCK_ACTIVE
                            </Badge>
                        </div>

                        {/* Coordinates Display */}
                        {points.length > 0 && (
                            <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-2 rounded text-[9px] font-mono text-slate-400 pointer-events-none">
                                LAT: {breadcrumbs[breadcrumbs.length - 1].lat.toFixed(4)}<br />
                                LNG: {breadcrumbs[breadcrumbs.length - 1].lng.toFixed(4)}
                            </div>
                        )}

                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
                                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                            </div>
                        )}

                        {!isLoading && points.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-600 bg-slate-950/80 italic text-xs">
                                No historical GPS data found for this period.
                            </div>
                        )}
                    </div>

                    {/* Timeline Log */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity className="h-3 w-3 text-blue-500" /> Path History
                            </h3>
                            <span className="text-[10px] text-slate-600 font-mono">ENCRYPTED TELEMETRY FEED</span>
                        </div>
                        <div className="max-h-[180px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {breadcrumbs.slice().reverse().map((b, i) => (
                                <div key={b.id} className="flex items-center gap-4 p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/50 text-[10px] transition-all hover:bg-slate-800/30">
                                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", i === 0 ? "bg-red-500" : "bg-blue-500/50")}></div>
                                    <div className="w-16 font-mono text-slate-500 shrink-0">
                                        {new Date(b.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                    <div className="flex-1 font-mono text-slate-300">
                                        TELEMETRY_PKT_0x{b.id.slice(0, 4).toUpperCase()}
                                    </div>
                                    <div className="text-right font-mono text-blue-400 italic">
                                        OK
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Decor */}
                <div className="h-1 bg-gradient-to-r from-blue-600 to-transparent opacity-50" />
            </div>
        </Dialog>
    );
}
