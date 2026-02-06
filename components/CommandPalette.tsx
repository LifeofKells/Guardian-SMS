/**
 * Enhanced Command Palette Component
 * Features: Recent searches, fuzzy matching, saved filters
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    Key,
    History,
    Bookmark,
    Sparkles,
    Trash2,
    Filter
} from 'lucide-react';
import { Dialog, Badge, cn, Button } from './ui';
import { db } from '../lib/db';
import type { Officer, Site, Incident } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: (page: string) => void;
}

interface SearchResult {
    id: string;
    type: 'page' | 'officer' | 'site' | 'incident' | 'recent' | 'filter';
    title: string;
    subtitle?: string;
    icon: any;
    action: () => void;
    metadata?: any;
}

interface RecentSearch {
    id: string;
    query: string;
    timestamp: number;
    resultCount: number;
}

interface SavedFilter {
    id: string;
    name: string;
    query: string;
    type: 'officers' | 'sites' | 'incidents';
    createdAt: number;
}

// Fuzzy matching algorithm
function fuzzyMatch(str: string, pattern: string): boolean {
    pattern = pattern.toLowerCase();
    str = str.toLowerCase();
    
    let patternIdx = 0;
    let strIdx = 0;
    
    while (patternIdx < pattern.length && strIdx < str.length) {
        if (pattern[patternIdx] === str[strIdx]) {
            patternIdx++;
        }
        strIdx++;
    }
    
    return patternIdx === pattern.length;
}

function calculateMatchScore(str: string, pattern: string): number {
    str = str.toLowerCase();
    pattern = pattern.toLowerCase();
    
    // Exact match gets highest score
    if (str === pattern) return 100;
    
    // Starts with gets high score
    if (str.startsWith(pattern)) return 80;
    
    // Contains gets medium score
    if (str.includes(pattern)) return 60;
    
    // Fuzzy match gets lower score
    if (fuzzyMatch(str, pattern)) return 40;
    
    return 0;
}

const RECENT_SEARCHES_KEY = 'guardian_recent_searches';
const SAVED_FILTERS_KEY = 'guardian_saved_filters';
const MAX_RECENT_SEARCHES = 10;

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
    const { organization } = useAuth();
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
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'filters'>('all');

    // Load recent searches and saved filters from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recent searches:', e);
            }
        }
        
        const filters = localStorage.getItem(SAVED_FILTERS_KEY);
        if (filters) {
            try {
                setSavedFilters(JSON.parse(filters));
            } catch (e) {
                console.error('Failed to parse saved filters:', e);
            }
        }
    }, []);

    // Save recent searches to localStorage
    const saveRecentSearch = useCallback((searchQuery: string, resultCount: number) => {
        if (!searchQuery.trim()) return;
        
        setRecentSearches(prev => {
            const newSearch: RecentSearch = {
                id: Date.now().toString(),
                query: searchQuery,
                timestamp: Date.now(),
                resultCount
            };
            
            // Remove duplicates and add new search at beginning
            const filtered = prev.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase());
            const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Clear recent searches
    const clearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    }, []);

    // Fetch searchable data
    useEffect(() => {
        if (open && organization) {
            const fetchData = async () => {
                const [officers, sites, incidents] = await Promise.all([
                    db.officers.select(organization.id),
                    db.sites.select(organization.id),
                    db.getFullIncidents(organization.id)
                ]);
                setData({
                    officers: officers.data || [],
                    sites: sites.data || [],
                    incidents: incidents.data || []
                });
            };
            fetchData();
        }
    }, [open, organization]);

    // Define Pages
    const pages = useMemo(() => [
        { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'main'] },
        { id: 'schedule', title: 'Schedule', icon: Calendar, keywords: ['calendar', 'shifts', 'roster'] },
        { id: 'officers', title: 'Officers', icon: Users, keywords: ['staff', 'personnel', 'guards', 'employees'] },
        { id: 'sites', title: 'Clients & Sites', icon: Building2, keywords: ['locations', 'clients', 'properties', 'buildings'] },
        { id: 'timesheets', title: 'Timesheets', icon: Clock, keywords: ['hours', 'time', 'clock', 'payroll'] },
        { id: 'reports', title: 'Reports', icon: FileText, keywords: ['analytics', 'data', 'incidents', 'activity'] },
        { id: 'settings', title: 'Settings', icon: Settings, keywords: ['configuration', 'preferences', 'options'] },
        { id: 'audit', title: 'Audit Logs', icon: Activity, keywords: ['logs', 'history', 'activity', 'tracking'] },
    ], []);

    // Filter results with fuzzy matching
    const results = useMemo(() => {
        const searchResults: SearchResult[] = [];
        const q = query.toLowerCase().trim();

        // Show recent searches and saved filters when no query
        if (q.length === 0) {
            // Recent searches
            if (recentSearches.length > 0 && (activeTab === 'all' || activeTab === 'recent')) {
                searchResults.push({
                    id: 'recent-header',
                    type: 'recent',
                    title: 'Recent Searches',
                    icon: History,
                    action: () => {}
                });
                
                recentSearches.slice(0, 5).forEach(search => {
                    searchResults.push({
                        id: `recent-${search.id}`,
                        type: 'recent',
                        title: search.query,
                        subtitle: `${search.resultCount} results • ${new Date(search.timestamp).toLocaleDateString()}`,
                        icon: Search,
                        action: () => {
                            setQuery(search.query);
                            inputRef.current?.focus();
                        }
                    });
                });
            }

            // Saved filters
            if (savedFilters.length > 0 && (activeTab === 'all' || activeTab === 'filters')) {
                searchResults.push({
                    id: 'filters-header',
                    type: 'filter',
                    title: 'Saved Filters',
                    icon: Bookmark,
                    action: () => {}
                });
                
                savedFilters.slice(0, 5).forEach(filter => {
                    searchResults.push({
                        id: `filter-${filter.id}`,
                        type: 'filter',
                        title: filter.name,
                        subtitle: `${filter.type} • "${filter.query}"`,
                        icon: Filter,
                        action: () => {
                            setQuery(filter.query);
                            inputRef.current?.focus();
                        }
                    });
                });
            }

            return searchResults;
        }

        // Actions / Commands
        if ('dark light mode theme toggle transition'.includes(q) && q.length > 0) {
            searchResults.push({
                id: 'theme-toggle',
                type: 'page',
                title: 'Toggle Theme',
                subtitle: 'Switch between light and dark mode',
                icon: Shield,
                action: () => {
                    document.documentElement.classList.toggle('dark');
                    const isDark = document.documentElement.classList.contains('dark');
                    localStorage.setItem('guardian-theme', isDark ? 'dark' : 'light');
                }
            });
        }

        // Pages with fuzzy matching and keyword support
        pages.forEach(p => {
            const titleScore = calculateMatchScore(p.title, q);
            const keywordScore = p.keywords?.some(k => calculateMatchScore(k, q) > 0) ? 50 : 0;
            const totalScore = Math.max(titleScore, keywordScore);
            
            if (totalScore > 0) {
                searchResults.push({
                    id: p.id,
                    type: 'page',
                    title: p.title,
                    subtitle: 'Navigation',
                    icon: p.icon,
                    action: () => onNavigate(p.id),
                    metadata: { score: totalScore }
                });
            }
        });

        // Officers with fuzzy matching
        data.officers.forEach(o => {
            const nameScore = calculateMatchScore(o.full_name, q);
            const badgeScore = o.badge_number ? calculateMatchScore(o.badge_number, q) : 0;
            const emailScore = o.email ? calculateMatchScore(o.email, q) : 0;
            const maxScore = Math.max(nameScore, badgeScore, emailScore);
            
            if (maxScore > 0) {
                searchResults.push({
                    id: o.id,
                    type: 'officer',
                    title: o.full_name,
                    subtitle: `Badge: ${o.badge_number || 'N/A'} • ${o.employment_status}`,
                    icon: User,
                    action: () => onNavigate('officers'),
                    metadata: { score: maxScore }
                });
            }
        });

        // Sites with fuzzy matching
        data.sites.forEach(s => {
            const nameScore = calculateMatchScore(s.name, q);
            const addressScore = calculateMatchScore(s.address, q);
            const maxScore = Math.max(nameScore, addressScore);
            
            if (maxScore > 0) {
                searchResults.push({
                    id: s.id,
                    type: 'site',
                    title: s.name,
                    subtitle: s.address,
                    icon: MapPin,
                    action: () => onNavigate('clients'),
                    metadata: { score: maxScore }
                });
            }
        });

        // Incidents with fuzzy matching
        data.incidents.forEach(i => {
            const typeScore = calculateMatchScore(i.type, q);
            const descScore = calculateMatchScore(i.description, q);
            const siteScore = i.site?.name ? calculateMatchScore(i.site.name, q) : 0;
            const maxScore = Math.max(typeScore, descScore, siteScore);
            
            if (maxScore > 0) {
                searchResults.push({
                    id: i.id,
                    type: 'incident',
                    title: i.type,
                    subtitle: `${i.site?.name || 'Unknown Site'} • ${i.severity} severity`,
                    icon: AlertTriangle,
                    action: () => onNavigate('reports'),
                    metadata: { score: maxScore }
                });
            }
        });

        // Sort by score and limit results
        return searchResults
            .filter(r => r.type === 'recent' || r.type === 'filter' || (r.metadata?.score || 0) > 0)
            .sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0))
            .slice(0, 12);
    }, [query, data, pages, onNavigate, recentSearches, savedFilters, activeTab]);

    // Save search when user selects a result
    const handleSelectResult = useCallback((result: SearchResult) => {
        if (query.trim() && result.type !== 'recent') {
            saveRecentSearch(query, results.length);
        }
        result.action();
        onOpenChange(false);
    }, [query, results.length, saveRecentSearch, onOpenChange]);

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
                    handleSelectResult(results[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                onOpenChange(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [results, selectedIndex, handleSelectResult, onOpenChange]);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setActiveTab('all');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            showClose={false}
            overlayClassName="items-start pt-[12vh]"
            className="max-w-lg overflow-hidden border-border/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]"
        >
            <div className="flex flex-col h-full max-h-[520px] overflow-hidden">
                {/* Search Input Area */}
                <div className="relative p-3 border-b border-border/40 bg-background/50 backdrop-blur-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent border-none pl-10 pr-24 py-2.5 text-[15px] focus:ring-0 outline-none placeholder:text-muted-foreground/50 transition-all font-medium"
                        placeholder="Search officers, sites, incidents..."
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

                {/* Tab Navigation - only show when no query */}
                {!query && (
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30 bg-muted/10">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                activeTab === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('recent')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                                activeTab === 'recent' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <History className="h-3 w-3" />
                            Recent
                        </button>
                        <button
                            onClick={() => setActiveTab('filters')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                                activeTab === 'filters' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Bookmark className="h-3 w-3" />
                            Saved Filters
                        </button>
                        {(recentSearches.length > 0 || savedFilters.length > 0) && (
                            <button
                                onClick={clearRecentSearches}
                                className="ml-auto px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="h-3 w-3" />
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto p-1.5 no-scrollbar bg-background/30">
                    {results.length === 0 ? (
                        <div className="py-10 text-center">
                            {query ? (
                                <>
                                    <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                                    <p className="text-[13px] text-muted-foreground/60 px-4">No results found for "{query}"</p>
                                    <p className="text-[11px] text-muted-foreground/40 mt-1">Try a different search term or check your spelling</p>
                                </>
                            ) : (
                                <>
                                    <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                                    <p className="text-[13px] text-muted-foreground/60 px-4">Start typing to search</p>
                                    <p className="text-[11px] text-muted-foreground/40 mt-1">Search officers, sites, incidents, or pages</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all duration-100",
                                        result.id.includes('header') && "pointer-events-none",
                                        idx === selectedIndex && !result.id.includes('header')
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted/50 text-foreground/80",
                                        result.id.includes('header') && "mt-2 first:mt-0"
                                    )}
                                    onClick={() => handleSelectResult(result)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    disabled={result.id.includes('header')}
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-md shrink-0 transition-colors",
                                        result.id.includes('header') ? "bg-transparent" :
                                        idx === selectedIndex ? "bg-primary text-white" : "bg-muted/70 text-muted-foreground"
                                    )}>
                                        <result.icon className={cn(
                                            "h-4 w-4",
                                            result.id.includes('header') && "text-muted-foreground/50"
                                        )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "font-medium text-[13px] truncate",
                                                result.id.includes('header') ? "text-muted-foreground/50 uppercase tracking-wider text-[10px]" :
                                                idx === selectedIndex ? "text-primary" : "text-foreground"
                                            )}>{result.title}</p>
                                            {!result.id.includes('header') && (
                                                <span className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground/40 shrink-0">
                                                    {result.type}
                                                </span>
                                            )}
                                        </div>
                                        {result.subtitle && !result.id.includes('header') && (
                                            <p className={cn(
                                                "text-[11px] truncate mt-0.5",
                                                idx === selectedIndex ? "text-primary/60" : "text-muted-foreground/60"
                                            )}>
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    {!result.id.includes('header') && (
                                        <ChevronRight className={cn(
                                            "h-3.5 w-3.5 shrink-0 transition-all ml-auto",
                                            idx === selectedIndex ? "translate-x-0 opacity-40" : "opacity-0"
                                        )} />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
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

export default CommandPalette;
