/**
 * Enhanced Command Palette Component
 * Features: Recent searches, fuzzy matching, saved filters, quick actions, natural language
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
    Filter,
    Plus,
    Play,
    Zap,
    Send,
    Download,
    Upload,
    Copy,
    Edit,
    Eye,
    RefreshCw,
    Bell,
    MessageSquare,
    HelpCircle,
    Moon,
    Sun,
    LogOut,
    UserPlus,
    CalendarPlus,
    ClipboardList,
    FileDown,
    Mail
} from 'lucide-react';
import { Dialog, Badge, cn, Button } from './ui';
import { db } from '../lib/db';
import type { Officer, Site, Incident } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: (page: string) => void;
}

interface SearchResult {
    id: string;
    type: 'page' | 'officer' | 'site' | 'incident' | 'recent' | 'filter' | 'action' | 'nlp';
    title: string;
    subtitle?: string;
    icon: any;
    action: () => void;
    metadata?: any;
    shortcut?: string;
    category?: string;
}

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: any;
    keywords: string[];
    shortcut?: string;
    category: 'create' | 'view' | 'export' | 'system' | 'communication';
    action: (context: ActionContext) => void;
}

interface ActionContext {
    navigate: (page: string) => void;
    closeModal: () => void;
    theme: { theme: string; setTheme: (t: string) => void };
    data: { officers: Officer[]; sites: Site[]; incidents: Incident[] };
}

interface NLPPattern {
    patterns: RegExp[];
    handler: (match: RegExpMatchArray, context: ActionContext) => SearchResult | null;
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

// ============================================================================
// QUICK ACTIONS DEFINITIONS
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
    // CREATE actions
    {
        id: 'create-shift',
        title: 'Create New Shift',
        description: 'Schedule a new shift assignment',
        icon: CalendarPlus,
        keywords: ['add shift', 'new shift', 'schedule shift', 'assign shift', 'create shift'],
        shortcut: 'C S',
        category: 'create',
        action: (ctx) => ctx.navigate('schedule')
    },
    {
        id: 'add-officer',
        title: 'Add New Officer',
        description: 'Register a new security officer',
        icon: UserPlus,
        keywords: ['new officer', 'add guard', 'new employee', 'hire officer', 'create officer'],
        shortcut: 'C O',
        category: 'create',
        action: (ctx) => ctx.navigate('officers')
    },
    {
        id: 'report-incident',
        title: 'Report Incident',
        description: 'Log a new security incident',
        icon: AlertTriangle,
        keywords: ['new incident', 'log incident', 'report problem', 'security issue', 'create incident'],
        shortcut: 'C I',
        category: 'create',
        action: (ctx) => ctx.navigate('reports')
    },
    {
        id: 'add-site',
        title: 'Add New Site',
        description: 'Register a new client site',
        icon: Building2,
        keywords: ['new site', 'add location', 'new client', 'add property', 'create site'],
        category: 'create',
        action: (ctx) => ctx.navigate('clients')
    },
    
    // VIEW actions
    {
        id: 'view-schedule-today',
        title: "View Today's Schedule",
        description: 'See all shifts scheduled for today',
        icon: Calendar,
        keywords: ['today shifts', 'current schedule', "today's roster", 'who is working'],
        category: 'view',
        action: (ctx) => ctx.navigate('schedule')
    },
    {
        id: 'view-active-officers',
        title: 'View Active Officers',
        description: 'Officers currently on shift',
        icon: Users,
        keywords: ['on duty', 'active guards', 'working now', 'clocked in', 'on shift'],
        category: 'view',
        action: (ctx) => ctx.navigate('officers')
    },
    {
        id: 'view-open-incidents',
        title: 'View Open Incidents',
        description: 'Unresolved incident reports',
        icon: AlertTriangle,
        keywords: ['pending incidents', 'open issues', 'unresolved', 'active incidents'],
        category: 'view',
        action: (ctx) => ctx.navigate('reports')
    },
    {
        id: 'view-timesheets',
        title: 'Review Timesheets',
        description: 'Pending timesheet approvals',
        icon: Clock,
        keywords: ['approve time', 'pending timesheets', 'review hours', 'timesheet approval'],
        category: 'view',
        action: (ctx) => ctx.navigate('timesheets')
    },
    
    // EXPORT actions
    {
        id: 'export-schedule',
        title: 'Export Schedule',
        description: 'Download schedule as PDF or CSV',
        icon: FileDown,
        keywords: ['download schedule', 'export roster', 'print schedule', 'schedule pdf'],
        category: 'export',
        action: (ctx) => ctx.navigate('schedule')
    },
    {
        id: 'export-reports',
        title: 'Generate Reports',
        description: 'Create and export analytics reports',
        icon: FileText,
        keywords: ['analytics', 'generate report', 'export data', 'download report'],
        category: 'export',
        action: (ctx) => ctx.navigate('reports')
    },
    {
        id: 'export-timesheets',
        title: 'Export Timesheets',
        description: 'Download timesheet data for payroll',
        icon: Download,
        keywords: ['payroll export', 'download timesheets', 'timesheet csv', 'export hours'],
        category: 'export',
        action: (ctx) => ctx.navigate('timesheets')
    },
    
    // SYSTEM actions
    {
        id: 'toggle-theme',
        title: 'Toggle Dark Mode',
        description: 'Switch between light and dark theme',
        icon: Moon,
        keywords: ['dark mode', 'light mode', 'theme', 'night mode', 'appearance'],
        shortcut: 'T',
        category: 'system',
        action: (ctx) => {
            ctx.theme.setTheme(ctx.theme.theme === 'dark' ? 'light' : 'dark');
            ctx.closeModal();
        }
    },
    {
        id: 'open-settings',
        title: 'Open Settings',
        description: 'Configure system preferences',
        icon: Settings,
        keywords: ['preferences', 'configuration', 'options', 'settings'],
        shortcut: ',',
        category: 'system',
        action: (ctx) => ctx.navigate('settings')
    },
    {
        id: 'view-audit-log',
        title: 'View Audit Log',
        description: 'System activity and changes',
        icon: Activity,
        keywords: ['audit', 'history', 'changes', 'log', 'activity'],
        category: 'system',
        action: (ctx) => ctx.navigate('audit')
    },
    {
        id: 'refresh-data',
        title: 'Refresh Data',
        description: 'Reload all data from server',
        icon: RefreshCw,
        keywords: ['reload', 'refresh', 'sync', 'update data'],
        category: 'system',
        action: (ctx) => {
            window.location.reload();
        }
    },
    
    // COMMUNICATION actions
    {
        id: 'send-broadcast',
        title: 'Send Broadcast Message',
        description: 'Message all officers',
        icon: Send,
        keywords: ['broadcast', 'message all', 'notify officers', 'announcement'],
        category: 'communication',
        action: (ctx) => ctx.navigate('officers')
    },
    {
        id: 'view-feedback',
        title: 'View Feedback',
        description: 'Officer and client feedback',
        icon: MessageSquare,
        keywords: ['feedback', 'comments', 'suggestions', 'reviews'],
        category: 'communication',
        action: (ctx) => ctx.navigate('feedback')
    }
];

// ============================================================================
// NATURAL LANGUAGE PATTERNS
// ============================================================================

function createNLPPatterns(context: ActionContext): NLPPattern[] {
    return [
        // "who's available/working on [day]"
        {
            patterns: [
                /who(?:'s| is)?\s+(?:available|working|on shift|on duty)\s+(?:on\s+)?(\w+)/i,
                /(?:available|working)\s+(?:officers?|guards?)\s+(?:on\s+)?(\w+)/i,
                /show\s+(?:me\s+)?(?:who(?:'s| is)?\s+)?(?:available|working)\s+(\w+)/i
            ],
            handler: (match, ctx) => ({
                id: 'nlp-availability',
                type: 'nlp',
                title: `Check Availability for ${match[1]}`,
                subtitle: 'View officers available on this day',
                icon: Users,
                action: () => ctx.navigate('schedule'),
                category: 'Smart Query'
            })
        },
        
        // "show [this week's/today's] overtime"
        {
            patterns: [
                /(?:show|view|get)\s+(?:me\s+)?(?:this week(?:'s)?|today(?:'s)?|all)?\s*overtime/i,
                /overtime\s+(?:this week|today|report)/i,
                /who\s+has\s+overtime/i
            ],
            handler: (match, ctx) => ({
                id: 'nlp-overtime',
                type: 'nlp',
                title: 'View Overtime Report',
                subtitle: 'Officers with overtime hours',
                icon: Clock,
                action: () => ctx.navigate('timesheets'),
                category: 'Smart Query'
            })
        },
        
        // "find coverage for [site]"
        {
            patterns: [
                /(?:find|get|need)\s+coverage\s+(?:for\s+)?(.+)/i,
                /(?:who can|anyone)\s+cover\s+(.+)/i,
                /coverage\s+(?:at|for)\s+(.+)/i
            ],
            handler: (match, ctx) => {
                const siteName = match[1]?.trim();
                return {
                    id: 'nlp-coverage',
                    type: 'nlp',
                    title: `Find Coverage${siteName ? ` for ${siteName}` : ''}`,
                    subtitle: 'Search for available officers to cover shifts',
                    icon: Users,
                    action: () => ctx.navigate('schedule'),
                    category: 'Smart Query'
                };
            }
        },
        
        // "incidents at [site]" or "incidents this week"
        {
            patterns: [
                /incidents?\s+(?:at|for|from)\s+(.+)/i,
                /(?:show|view|get)\s+(?:me\s+)?incidents?\s+(?:at|for|from)?\s*(.+)?/i,
                /(.+)\s+incidents?/i
            ],
            handler: (match, ctx) => {
                const location = match[1]?.trim();
                return {
                    id: 'nlp-incidents',
                    type: 'nlp',
                    title: `View Incidents${location ? ` at ${location}` : ''}`,
                    subtitle: 'Search incident reports',
                    icon: AlertTriangle,
                    action: () => ctx.navigate('reports'),
                    category: 'Smart Query'
                };
            }
        },
        
        // "hours for [officer name]"
        {
            patterns: [
                /hours\s+(?:for|worked by)\s+(.+)/i,
                /(?:how many|total)\s+hours\s+(?:did|has|for)\s+(.+)/i,
                /(.+?)(?:'s)?\s+hours/i
            ],
            handler: (match, ctx) => {
                const name = match[1]?.trim();
                return {
                    id: 'nlp-hours',
                    type: 'nlp',
                    title: `View Hours${name ? ` for ${name}` : ''}`,
                    subtitle: 'Check timesheet and worked hours',
                    icon: Clock,
                    action: () => ctx.navigate('timesheets'),
                    category: 'Smart Query'
                };
            }
        },
        
        // "schedule [officer] at [site]"
        {
            patterns: [
                /schedule\s+(.+?)\s+(?:at|to|for)\s+(.+)/i,
                /assign\s+(.+?)\s+(?:to|at)\s+(.+)/i,
                /put\s+(.+?)\s+(?:at|on)\s+(.+)/i
            ],
            handler: (match, ctx) => {
                const officer = match[1]?.trim();
                const site = match[2]?.trim();
                return {
                    id: 'nlp-schedule-officer',
                    type: 'nlp',
                    title: `Schedule ${officer} at ${site}`,
                    subtitle: 'Create a new shift assignment',
                    icon: CalendarPlus,
                    action: () => ctx.navigate('schedule'),
                    category: 'Smart Action'
                };
            }
        },
        
        // "go to [page]"
        {
            patterns: [
                /go\s+to\s+(.+)/i,
                /open\s+(.+)/i,
                /navigate\s+(?:to\s+)?(.+)/i,
                /show\s+(?:me\s+)?(?:the\s+)?(.+)\s+page/i
            ],
            handler: (match, ctx) => {
                const page = match[1]?.trim().toLowerCase();
                const pageMap: Record<string, string> = {
                    'dashboard': 'dashboard',
                    'home': 'dashboard',
                    'schedule': 'schedule',
                    'calendar': 'schedule',
                    'shifts': 'schedule',
                    'officers': 'officers',
                    'guards': 'officers',
                    'staff': 'officers',
                    'sites': 'clients',
                    'clients': 'clients',
                    'locations': 'clients',
                    'timesheets': 'timesheets',
                    'time': 'timesheets',
                    'hours': 'timesheets',
                    'reports': 'reports',
                    'incidents': 'reports',
                    'settings': 'settings',
                    'audit': 'audit',
                    'feedback': 'feedback'
                };
                const targetPage = pageMap[page] || page;
                return {
                    id: 'nlp-navigate',
                    type: 'nlp',
                    title: `Go to ${page.charAt(0).toUpperCase() + page.slice(1)}`,
                    subtitle: 'Navigate to page',
                    icon: ChevronRight,
                    action: () => ctx.navigate(targetPage),
                    category: 'Navigation'
                };
            }
        }
    ];
}

// Helper to match NLP patterns
function matchNLPPatterns(query: string, context: ActionContext): SearchResult[] {
    const results: SearchResult[] = [];
    const patterns = createNLPPatterns(context);
    
    for (const { patterns: regexes, handler } of patterns) {
        for (const regex of regexes) {
            const match = query.match(regex);
            if (match) {
                const result = handler(match, context);
                if (result && !results.find(r => r.id === result.id)) {
                    results.push(result);
                }
                break; // Only match first pattern per group
            }
        }
    }
    
    return results;
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
    const { organization } = useAuth();
    const { theme, setTheme } = useTheme();
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
    const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'filters' | 'actions'>('all');

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

            // Quick Actions - show when no query or on actions tab
            if (activeTab === 'all' || activeTab === 'actions') {
                const actionContext: ActionContext = {
                    navigate: onNavigate,
                    closeModal: () => onOpenChange(false),
                    theme: { theme, setTheme },
                    data
                };

                // Group actions by category
                const categories = ['create', 'view', 'system'] as const;
                const categoryLabels: Record<string, string> = {
                    create: 'Quick Create',
                    view: 'Quick View',
                    system: 'System'
                };

                categories.forEach(category => {
                    const categoryActions = QUICK_ACTIONS.filter(a => a.category === category).slice(0, 3);
                    if (categoryActions.length > 0) {
                        searchResults.push({
                            id: `action-header-${category}`,
                            type: 'action',
                            title: categoryLabels[category] || category,
                            icon: Zap,
                            action: () => {}
                        });

                        categoryActions.forEach(action => {
                            searchResults.push({
                                id: `action-${action.id}`,
                                type: 'action',
                                title: action.title,
                                subtitle: action.description,
                                icon: action.icon,
                                shortcut: action.shortcut,
                                action: () => action.action(actionContext)
                            });
                        });
                    }
                });
            }

            return searchResults;
        }

        // Build action context for NLP and quick actions
        const actionContext: ActionContext = {
            navigate: onNavigate,
            closeModal: () => onOpenChange(false),
            theme: { theme, setTheme },
            data
        };

        // Try NLP patterns first (natural language queries)
        const nlpResults = matchNLPPatterns(q, actionContext);
        if (nlpResults.length > 0) {
            searchResults.push({
                id: 'nlp-header',
                type: 'nlp',
                title: 'Smart Suggestions',
                icon: Sparkles,
                action: () => {}
            });
            nlpResults.forEach(r => {
                searchResults.push({ ...r, metadata: { score: 200 } }); // High priority
            });
        }

        // Quick Actions matching query
        QUICK_ACTIONS.forEach(action => {
            const titleScore = calculateMatchScore(action.title, q);
            const descScore = calculateMatchScore(action.description, q);
            const keywordScore = action.keywords.some(k => 
                k.toLowerCase().includes(q) || calculateMatchScore(k, q) > 50
            ) ? 70 : 0;
            const maxScore = Math.max(titleScore, descScore, keywordScore);

            if (maxScore > 0) {
                searchResults.push({
                    id: `action-${action.id}`,
                    type: 'action',
                    title: action.title,
                    subtitle: action.description,
                    icon: action.icon,
                    shortcut: action.shortcut,
                    action: () => action.action(actionContext),
                    metadata: { score: maxScore + 20 } // Boost actions slightly
                });
            }
        });

        // Actions / Commands (legacy theme toggle - keep for backwards compat)
        if ('dark light mode theme toggle transition'.includes(q) && q.length > 0) {
            // Already handled by QUICK_ACTIONS, skip duplicate
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
            .filter(r => r.type === 'recent' || r.type === 'filter' || r.type === 'action' || r.type === 'nlp' || (r.metadata?.score || 0) > 0)
            .sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0))
            .slice(0, 15);
    }, [query, data, pages, onNavigate, onOpenChange, recentSearches, savedFilters, activeTab, theme, setTheme]);

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
                        placeholder="Search or type a command..."
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
                            Saved
                        </button>
                        <button
                            onClick={() => setActiveTab('actions')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                                activeTab === 'actions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Zap className="h-3 w-3" />
                            Actions
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
                                    <Zap className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                                    <p className="text-[13px] text-muted-foreground/60 px-4">Type a command or search</p>
                                    <p className="text-[11px] text-muted-foreground/40 mt-1">Try "create shift" or "who's available Monday"</p>
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
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {result.shortcut && (
                                                        <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 h-4 bg-muted/40 text-muted-foreground/70 border-none">
                                                            {result.shortcut}
                                                        </Badge>
                                                    )}
                                                    <span className={cn(
                                                        "text-[10px] uppercase font-bold tracking-tight shrink-0",
                                                        result.type === 'action' ? "text-primary/50" :
                                                        result.type === 'nlp' ? "text-amber-500/50" :
                                                        "text-muted-foreground/40"
                                                    )}>
                                                        {result.type === 'nlp' ? 'smart' : result.type}
                                                    </span>
                                                </div>
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
