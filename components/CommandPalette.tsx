/**
 * CommandPalette Component
 * Global Cmd+K search interface for Guardian SMS
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Search,
    User,
    MapPin,
    AlertTriangle,
    LayoutDashboard,
    Calendar,
    Users,
    Building2,
    Clock,
    FileText,
    Settings,
    ChevronRight,
    Command,
    X,
    Activity,
    Shield,
    Key
} from 'lucide-react';
import { Dialog, Badge, cn } from './ui';
import { db } from '../lib/db';
import type { Officer, Site, Incident } from '../lib/types';

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: (page: string) => void;
}

interface SearchResult {
    id: string;
    type: 'page' | 'officer' | 'site' | 'incident';
    title: string;
    subtitle?: string;
    icon: any;
    action: () => void;
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [data, setData] = useState<{
        officers: Officer[];
        sites: Site[];
        incidents: Incident[];
    }>({
        officers: [],
        sites: [],
        incidents: []
    });

    // Fetch searchable data
    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                const [officers, sites, incidents] = await Promise.all([
                    db.officers.select(),
                    db.sites.select(),
                    db.getFullIncidents()
                ]);
                setData({
                    officers: officers.data || [],
                    sites: sites.data || [],
                    incidents: incidents.data || []
                });
            };
            fetchData();
        }
    }, [open]);

    // Define Pages
    const pages = useMemo(() => [
        { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
        { id: 'schedule', title: 'Schedule', icon: Calendar },
        { id: 'officers', title: 'Officers', icon: Users },
        { id: 'sites', title: 'Clients & Sites', icon: Building2 },
        { id: 'timesheets', title: 'Timesheets', icon: Clock },
        { id: 'reports', title: 'Reports', icon: FileText },
        { id: 'settings', title: 'Settings', icon: Settings },
        { id: 'audit', title: 'Audit Logs', icon: Activity },
    ], []);

    // Define Theme Toggle Command
    useEffect(() => {
        // We'll need access to the theme context if we want to toggle it here.
        // For now, let's just use the pages and data.
    }, []);

    // Filter results
    const results = useMemo(() => {
        const searchResults: SearchResult[] = [];
        const q = query.toLowerCase().trim();

        // 0. Actions / Commands
        if ('dark light mode theme toggle transition'.includes(q) && q.length > 0) {
            searchResults.push({
                id: 'theme-toggle',
                type: 'page',
                title: 'Toggle Theme',
                subtitle: 'Switch between light and dark mode',
                icon: Shield, // Or Sun/Moon if we had them
                action: () => {
                    document.documentElement.classList.toggle('dark');
                    const isDark = document.documentElement.classList.contains('dark');
                    localStorage.setItem('guardian-theme', isDark ? 'dark' : 'light');
                }
            });
        }

        // 1. Pages
        pages.forEach(p => {
            if (p.title.toLowerCase().includes(q) || 'navigation'.includes(q)) {
                searchResults.push({
                    id: p.id,
                    type: 'page',
                    title: p.title,
                    subtitle: 'Navigation',
                    icon: p.icon,
                    action: () => onNavigate(p.id)
                });
            }
        });

        if (q.length === 0) return searchResults.slice(0, 8);

        // 2. Officers
        data.officers.forEach(o => {
            if (o.full_name.toLowerCase().includes(q) || o.badge_number?.toLowerCase().includes(q)) {
                searchResults.push({
                    id: o.id,
                    type: 'officer',
                    title: o.full_name,
                    subtitle: `Badge: ${o.badge_number || 'N/A'} • ${o.employment_status}`,
                    icon: User,
                    action: () => onNavigate('officers') // In a real app, go to specific officer
                });
            }
        });

        // 3. Sites
        data.sites.forEach(s => {
            if (s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)) {
                searchResults.push({
                    id: s.id,
                    type: 'site',
                    title: s.name,
                    subtitle: s.address,
                    icon: MapPin,
                    action: () => onNavigate('clients')
                });
            }
        });

        // 4. Incidents
        data.incidents.forEach(i => {
            if (i.type.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) {
                searchResults.push({
                    id: i.id,
                    type: 'incident',
                    title: i.type,
                    subtitle: `${i.site?.name} • ${i.severity} severity`,
                    icon: AlertTriangle,
                    action: () => onNavigate('reports')
                });
            }
        });

        return searchResults.slice(0, 10);
    }, [query, data, pages, onNavigate]);

    // Handle Keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + results.length) % Math.max(results.length, 1));
            } else if (e.key === 'Enter') {
                if (results[selectedIndex]) {
                    results[selectedIndex].action();
                    onOpenChange(false);
                }
            } else if (e.key === 'Escape') {
                onOpenChange(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [results, selectedIndex, onOpenChange]);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            showClose={false}
            overlayClassName="items-start pt-[12vh]"
            className="max-w-md overflow-hidden border-border/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]"
        >
            <div className="flex flex-col h-full max-h-[460px] overflow-hidden">
                {/* Search Input Area - Refined */}
                <div className="relative p-3 border-b border-border/40 bg-background/50 backdrop-blur-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent border-none pl-10 pr-12 py-2.5 text-[15px] focus:ring-0 outline-none placeholder:text-muted-foreground/50 transition-all font-medium"
                        placeholder="Search Guardian..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 h-5 bg-muted/40 text-muted-foreground/70 border-none">ESC</Badge>
                    </div>
                </div>

                {/* Results Area - More Compact */}
                <div className="flex-1 overflow-y-auto p-1.5 no-scrollbar bg-background/30">
                    {results.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-[13px] text-muted-foreground/60 px-4">No results found for {query ? `"${query}"` : 'your search'}.</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all duration-100",
                                        idx === selectedIndex
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted/50 text-foreground/80"
                                    )}
                                    onClick={() => {
                                        result.action();
                                        onOpenChange(false);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-md shrink-0 transition-colors",
                                        idx === selectedIndex ? "bg-primary text-white" : "bg-muted/70 text-muted-foreground"
                                    )}>
                                        <result.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "font-medium text-[13px] truncate",
                                                idx === selectedIndex ? "text-primary" : "text-foreground"
                                            )}>{result.title}</p>
                                            <span className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground/40 shrink-0">
                                                {result.type}
                                            </span>
                                        </div>
                                        {result.subtitle && (
                                            <p className={cn(
                                                "text-[11px] truncate mt-0.5",
                                                idx === selectedIndex ? "text-primary/60" : "text-muted-foreground/60"
                                            )}>
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className={cn(
                                        "h-3.5 w-3.5 shrink-0 transition-all ml-auto",
                                        idx === selectedIndex ? "translate-x-0 opacity-40" : "opacity-0"
                                    )} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Minimalist */}
                <div className="px-4 py-2 border-t border-border/30 bg-muted/10 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground/50 font-medium">GUARDIAN COMMAND</p>
                    <div className="flex items-center gap-4 opacity-50">
                        <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Badge variant="outline" className="px-1 py-0 h-4 border-none bg-muted/60 text-[9px]">↑↓</Badge> Navigate
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Badge variant="outline" className="px-1 py-0 h-4 border-none bg-muted/60 text-[9px]">ENTER</Badge> Select
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
