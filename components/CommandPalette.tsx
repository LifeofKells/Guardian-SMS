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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <div className="flex flex-col h-full max-h-[500px]">
                {/* Search Input Area */}
                <div className="relative p-4 border-b border-border/50">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-muted/50 dark:bg-slate-900 border-none rounded-xl pl-12 pr-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="Search for anything... (officers, sites, pages)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 opacity-60">ESC</Badge>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                    {results.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Search className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">No matches found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-150",
                                        idx === selectedIndex
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                                            : "hover:bg-muted/80 text-foreground"
                                    )}
                                    onClick={() => {
                                        result.action();
                                        onOpenChange(false);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className={cn(
                                        "p-2 rounded-md shrink-0",
                                        idx === selectedIndex ? "bg-white/20" : "bg-muted"
                                    )}>
                                        <result.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm truncate">{result.title}</p>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] uppercase h-4 px-1 leading-none border-none",
                                                    idx === selectedIndex ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                                )}
                                            >
                                                {result.type}
                                            </Badge>
                                        </div>
                                        {result.subtitle && (
                                            <p className={cn(
                                                "text-[11px] truncate mt-0.5",
                                                idx === selectedIndex ? "text-primary-foreground/80" : "text-muted-foreground"
                                            )}>
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className={cn(
                                        "h-4 w-4 shrink-0 transition-transform",
                                        idx === selectedIndex ? "translate-x-0.5 opacity-100" : "opacity-0"
                                    )} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Hints */}
                <div className="p-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Key className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Shortcuts</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                <Badge variant="outline" className="px-1 py-0 h-4 min-w-4 text-center">↑↓</Badge> Navigate
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                <Badge variant="outline" className="px-1 py-0 h-4 min-w-4 text-center">↵</Badge> Select
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
