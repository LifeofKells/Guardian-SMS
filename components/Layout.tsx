
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Users,
  Building2,
  Clock,
  FileText,
  Settings,
  ShieldCheck,
  LogOut,
  Banknote,
  Moon,
  Sun,
  MessageSquare,
  MessagesSquare,
  Menu,
  X,
  Activity,
  ChevronDown,
  ChevronRight,
  Search,
  Command,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  Sparkles,
  Zap
} from 'lucide-react';
import { Avatar, Badge, Button, cn, Tooltip } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { CommandPalette } from './CommandPalette';
import { OnboardingFlow, useOnboarding } from './OnboardingFlow';
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { AnimatedDarkModeToggle } from './AnimatedDarkModeToggle';
import { BreadcrumbNav } from './BreadcrumbNav';
import { NotificationBell } from './NotificationCenter';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { ChannelMessage, TimeEntry, Feedback } from '../lib/types';
import { ActivityFeedProvider, LiveActivityWidget, ActivityStream } from './LiveActivityPulse';
import { QuickActionDock } from './QuickActionDock';

const pageTitleMap: Record<string, string> = {
  dashboard: 'Command Center',
  schedule: 'Schedule & Dispatch',
  calendar: 'Calendar View',
  officers: 'Officer Roster',
  timesheets: 'Time & Attendance',
  clients: 'Clients & Sites',
  accounting: 'Payroll & Invoicing',
  resources: 'Equipment & Resources',
  messaging: 'Team Messaging',
  reports: 'Analytics & Reports',
  settings: 'System Settings',
  feedback: 'Feedback & Support',
  audit: 'Audit & Compliance Logs'
};

/* ========================================================================
   NAV ITEMS — Ultra-slim, refined
   ======================================================================== */
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  badge?: number;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggle?: (e: React.MouseEvent) => void;
}

function NavItem({ icon: Icon, label, active, onClick, collapsed, badge, isExpandable, isExpanded, onToggle }: NavItemProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-md transition-colors duration-150 group relative",
        collapsed
          ? "w-8 h-8 justify-center mx-auto"
          : "w-full gap-2.5 px-2.5 py-1.5 justify-start text-left",
        active
          ? collapsed
            ? "bg-primary/15 text-primary"
            : "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {/* Active indicator */}
      {active && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r bg-primary" />
      )}

      <div className="relative shrink-0 flex items-center justify-center">
        <Icon className={cn(
          "shrink-0 transition-colors duration-150",
          collapsed ? "h-4 w-4" : "h-3.5 w-3.5"
        )} />
        {/* Badge dot collapsed */}
        {collapsed && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white px-0.5 ring-2 ring-card">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      {!collapsed && (
        <span className="truncate flex-1 text-left text-xs font-medium leading-normal">{label}</span>
      )}

      {/* Expandable Chevron */}
      {!collapsed && isExpandable && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.(e);
          }}
          className="ml-auto p-1 rounded-md hover:bg-foreground/5 transition-colors"
        >
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform duration-300",
            isExpanded && "rotate-90"
          )} />
        </div>
      )}

      {/* Badge expanded (only if not expandable or if badge is more important) */}
      {!collapsed && !isExpandable && badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-destructive text-[10px] font-bold text-white shrink-0 ml-auto">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip content={badge ? `${label} (${badge})` : label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

function NavSubItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        <button
          onClick={onClick}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 mx-auto group",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
        </button>
      </Tooltip>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full gap-2.5 pl-8 pr-3 py-1.5 rounded-lg transition-all duration-300 group relative text-left",
        active
          ? "text-primary font-semibold bg-primary/5"
          : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
      )}
    >
      {/* Tree connector */}
      <span className={cn(
        "absolute left-[18px] top-0 bottom-0 w-[1.5px] transition-colors duration-300",
        active ? "bg-primary/30" : "bg-border/50"
      )} />
      <span className={cn(
        "absolute left-[18px] top-1/2 w-2.5 h-[1.5px] rounded-r transition-colors duration-300",
        active ? "bg-primary/50" : "bg-border/50"
      )} />
      <Icon className={cn(
        "h-3.5 w-3.5 shrink-0 relative z-10 transition-transform duration-300 group-hover:scale-110",
        active ? "text-primary" : "text-muted-foreground/50"
      )} />
      <span className={cn(
        "truncate text-[12.5px] relative z-10",
        active ? "font-semibold text-primary" : "font-medium"
      )}>{label}</span>
    </button>
  );
}

/* ========================================================================
   NAV SECTIONS — grouped with subtle section headers
   ======================================================================== */
function SectionLabel({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) return <div className="my-1.5 mx-2 h-px bg-border" />;
  return (
    <div className="my-1.5 mx-2 h-px bg-border" />
  );
}

function NavMenu({ currentPage, setPage, onItemClick, collapsed }: { currentPage: string, setPage: (p: string) => void, onItemClick?: () => void, collapsed?: boolean }) {
  const { profile, user, organization } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';
  const isClient = profile?.role === 'client';

  const showOfficers = isAdmin;
  const showClients = isAdmin;
  const showAccounting = isAdmin;
  const showSettings = isAdmin || isClient;
  const showFeedback = isAdmin || isClient;
  const showMessaging = isAdmin || isClient;
  const showAudit = isAdmin;

  // --- Unread badge counts ---
  const { data: allMessages = [] } = useQuery({
    queryKey: ['channel_messages', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.channel_messages.select(organization.id);
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time_entries', organization?.id],
    enabled: !!organization && isAdmin,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.time_entries.select(organization.id);
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: feedbackList = [] } = useQuery({
    queryKey: ['feedback', organization?.id],
    enabled: !!organization && (isAdmin || isClient),
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.feedback.select(organization.id);
      return data || [];
    },
    staleTime: 60000,
  });

  const badgeCounts = useMemo(() => {
    const me = profile?.id || user?.uid || '';
    const unreadMessages = allMessages.filter(
      (m: ChannelMessage) => m.sender_id !== me && !(m.read_by || []).includes(me)
    ).length;
    const pendingTimesheets = isAdmin ? timeEntries.filter((e: TimeEntry) => e.status === 'pending').length : 0;
    const newFeedback = (isAdmin || isClient) ? feedbackList.filter((f: Feedback) => f.status === 'new').length : 0;
    return { messaging: unreadMessages, timesheets: pendingTimesheets, feedback: newFeedback };
  }, [allMessages, timeEntries, feedbackList, profile?.id, user?.uid, isAdmin, isClient]);

  const [isScheduleOpen, setIsScheduleOpen] = useState(() => {
    return currentPage === 'schedule' || currentPage === 'calendar';
  });

  const handleClick = (page: string) => {
    setPage(page);
    if (onItemClick) onItemClick();
  };

  const toggleSchedule = (e: React.MouseEvent) => {
    setIsScheduleOpen(!isScheduleOpen);
  };

  return (
    <nav className={cn("grid items-start text-sm font-medium gap-0.5 pb-8 transition-all duration-300", collapsed ? "px-2" : "px-2")}>
      {/* Core */}
      <SectionLabel label="Core" collapsed={collapsed} />
      <NavItem icon={LayoutDashboard} label="Workspace" active={currentPage === 'dashboard'} onClick={() => handleClick('dashboard')} collapsed={collapsed} />

      <div className="space-y-0.5">
        <NavItem
          icon={CalendarDays}
          label="Schedule"
          active={currentPage === 'schedule'}
          onClick={() => {
            handleClick('schedule');
            if (!isScheduleOpen) setIsScheduleOpen(true);
          }}
          collapsed={collapsed}
          isExpandable={!collapsed}
          isExpanded={isScheduleOpen}
          onToggle={toggleSchedule}
        />

        {isScheduleOpen && !collapsed && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
            <NavSubItem
              icon={Calendar}
              label="Calendar"
              active={currentPage === 'calendar'}
              onClick={() => handleClick('calendar')}
              collapsed={collapsed}
            />
          </div>
        )}
      </div>

      {!isClient && <NavItem icon={Clock} label="Timesheets" active={currentPage === 'timesheets'} onClick={() => handleClick('timesheets')} collapsed={collapsed} badge={badgeCounts.timesheets} />}

      {/* Operations */}
      {(showOfficers || showClients || showAccounting) && (
        <>
          <SectionLabel label="Operations" collapsed={collapsed} />
          {showOfficers && <NavItem icon={Users} label="Officers" active={currentPage === 'officers'} onClick={() => handleClick('officers')} collapsed={collapsed} />}
          {showClients && <NavItem icon={Building2} label="Clients & Sites" active={currentPage === 'clients'} onClick={() => handleClick('clients')} collapsed={collapsed} />}
          {showAccounting && <NavItem icon={Banknote} label="Accounting" active={currentPage === 'accounting'} onClick={() => handleClick('accounting')} collapsed={collapsed} />}
          {showAccounting && <NavItem icon={Package} label="Resources" active={currentPage === 'resources'} onClick={() => handleClick('resources')} collapsed={collapsed} />}
        </>
      )}

      {/* Portal */}
      {isAdmin && (
        <>
          {!collapsed && (
            <div className="px-3 pt-4 pb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Portal</p>
            </div>
          )}
          {collapsed && <div className="my-2" />}
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center rounded-xl transition-all duration-300 group text-muted-foreground hover:text-foreground hover:bg-muted/40",
              collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full gap-3 px-3 py-2"
            )}
          >
            <Building2 className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
            {!collapsed && <span className="text-[13px]">Client Portal Hub</span>}
          </a>
        </>
      )}

      {/* Insights */}
      <SectionLabel label="Insights" collapsed={collapsed} />
      <NavItem icon={FileText} label="Reports" active={currentPage === 'reports'} onClick={() => handleClick('reports')} collapsed={collapsed} />
      {showMessaging && <NavItem icon={MessagesSquare} label="Messaging" active={currentPage === 'messaging'} onClick={() => handleClick('messaging')} collapsed={collapsed} badge={currentPage === 'messaging' ? 0 : badgeCounts.messaging} />}
      {showFeedback && <NavItem icon={MessageSquare} label="Feedback" active={currentPage === 'feedback'} onClick={() => handleClick('feedback')} collapsed={collapsed} badge={currentPage === 'feedback' ? 0 : badgeCounts.feedback} />}
      {showAudit && <NavItem icon={Activity} label="Audit Logs" active={currentPage === 'audit'} onClick={() => handleClick('audit')} collapsed={collapsed} />}

      {/* System */}
      {showSettings && (
        <>
          <SectionLabel label="System" collapsed={collapsed} />
          <NavItem icon={Settings} label="Settings" active={currentPage === 'settings'} onClick={() => handleClick('settings')} collapsed={collapsed} />
        </>
      )}
    </nav>
  );
}

/* ========================================================================
   SCROLLABLE MENU WRAPPER
   ======================================================================== */
function ScrollableMenu({ children, className }: { children?: React.ReactNode, className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const observer = new ResizeObserver(() => {
      checkScroll();
    });

    observer.observe(scrollEl);
    const contentEl = scrollEl.firstElementChild;
    if (contentEl) observer.observe(contentEl);
    checkScroll();
    window.addEventListener('resize', checkScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, children]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top fade */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none transition-opacity duration-300",
          canScrollUp ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-h-0 relative",
          "pb-10",
          className
        )}
      >
        {children}
      </div>

      {/* Bottom fade + arrow */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none transition-opacity duration-300 flex justify-center items-end pb-1",
          canScrollDown ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronDown className="h-4 w-4 text-muted-foreground/50 animate-bounce" />
      </div>
    </div>
  );
}

/* ========================================================================
   TOAST CONTAINER
   ======================================================================== */
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 w-full bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-right-full fade-in duration-300"
        >
          {toast.type === 'success' && <div className="text-emerald-500 mt-0.5"><ShieldCheck className="h-5 w-5" /></div>}
          {toast.type === 'error' && <div className="text-red-500 mt-0.5"><Activity className="h-5 w-5" /></div>}
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{toast.title}</h4>
            {toast.description && <p className="text-xs text-muted-foreground mt-1">{toast.description}</p>}
            {toast.action && toast.actionLabel && (
              <button
                onClick={() => {
                  toast.action?.();
                  removeToast(toast.id);
                }}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================
   MAIN LAYOUT
   ======================================================================== */
export function Layout({ children, currentPage, setPage }: { children?: React.ReactNode, currentPage: string, setPage: (p: string) => void }) {
  const { user, profile, logout, organization } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Onboarding
  const { showOnboarding, dismissOnboarding } = useOnboarding();

  // Keyboard Shortcuts
  const { isOpen: showShortcuts, setIsOpen: setShowShortcuts } = useKeyboardShortcutsHelp();

  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Pro Guard',
      description: 'Your comprehensive security management system. Let\'s take a quick tour to get you started.'
    },
    {
      id: 'dashboard',
      title: 'Command Center',
      description: 'Monitor your operations in real-time. View active officers, incidents, and site status at a glance.',
      targetSelector: '[data-tour="dashboard"]',
      position: 'bottom' as const
    },
    {
      id: 'command-palette',
      title: 'Quick Search',
      description: 'Press Cmd+K (or Ctrl+K) anytime to search officers, sites, and incidents instantly.',
      targetSelector: '[data-tour="search"]',
      position: 'bottom' as const
    },
    {
      id: 'sidebar',
      title: 'Navigation',
      description: 'Access all modules from the sidebar. Use the collapse button to save space.',
      targetSelector: '[data-tour="sidebar"]',
      position: 'right' as const
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      description: 'Start by adding officers and sites, or jump right into scheduling shifts. Press ? anytime for keyboard shortcuts.'
    }
  ];

  // Branding Logic
  const branding = organization?.white_label || {
    company_name: 'Pro Guard',
    logo_url: '/favicon.svg',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    accent_color: '#10b981',
  };

  const companyName = branding.company_name === 'Pro Guard' && organization?.name ? organization.name : branding.company_name;
  const logoUrl = branding.logo_url || '/favicon.svg';

  // Apply branding colors to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;

    const hexToHsl = (hex: string): string => {
      hex = hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    if (branding.primary_color) {
      const primaryHsl = hexToHsl(branding.primary_color);
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--primary-foreground', '0 0% 100%');
    }

    if (branding.accent_color) {
      const accentHsl = hexToHsl(branding.accent_color);
      root.style.setProperty('--accent', accentHsl);
    }

    if (branding.favicon_url) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.favicon_url;
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    if (branding.company_name && branding.company_name !== 'Pro Guard') {
      document.title = `${branding.company_name} - Admin Portal`;
    }
  }, [branding.primary_color, branding.accent_color, branding.favicon_url, branding.company_name]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar_collapsed', String(newState));
      return newState;
    });
  };

  return (
    <ActivityFeedProvider demoMode={true}>
      <div className={cn(
        "grid h-screen w-full overflow-hidden bg-background transition-all duration-500 ease-in-out",
        isCollapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[240px_1fr] lg:grid-cols-[256px_1fr]"
      )}>

      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} onNavigate={setPage} />
      <ToastContainer />

      {/* ═══════════════════════════════════════════════
          SIDEBAR
          ═══════════════════════════════════════════════ */}
      <div data-tour="sidebar" className={cn(
        "hidden md:flex h-full flex-col z-20 transition-all duration-500 ease-in-out relative min-h-0",
        "bg-card border-r border-border/30",
        isCollapsed ? "w-[72px]" : "w-[256px]"
      )}>

        {/* Collapse toggle pill */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-8 z-50 h-6 w-6 rounded-full border border-border/50 bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all duration-300 focus:outline-none"
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>

        <div className="flex h-full flex-col gap-0 min-h-0">

          {/* Logo header */}
          <div className={cn(
            "flex items-center border-b shrink-0 border-border transition-all duration-300 overflow-hidden h-12",
            isCollapsed ? "justify-center px-0" : "px-3"
          )}>
            <div className="flex items-center gap-2.5">
              <img src={logoUrl} className="h-6 w-6 shrink-0 object-contain" alt="Logo" />
              <span className={cn(
                "text-sm font-semibold tracking-tight text-foreground transition-all duration-200 whitespace-nowrap",
                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                {companyName}
              </span>
            </div>
          </div>

          {/* Quick search trigger (expanded only) */}
          {!isCollapsed && (
            <div className="px-2 pt-2 pb-1 shrink-0">
              <button
                onClick={() => setIsCommandOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
              >
                <Search className="h-3 w-3 shrink-0" />
                <span className="flex-1 text-left truncate">Search…</span>
                <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-border px-1 font-mono text-[9px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}

          {/* Navigation */}
          <ScrollableMenu className="pt-1">
            <NavMenu currentPage={currentPage} setPage={setPage} collapsed={isCollapsed} />
          </ScrollableMenu>

          {/* User card at bottom */}
          <div className={cn("shrink-0 border-t border-border py-2.5", isCollapsed ? "px-2" : "px-2.5")}>
            <div className={cn(
              "flex items-center gap-2 rounded-md transition-colors duration-150 cursor-default",
              isCollapsed ? "justify-center" : "px-2 py-1.5"
            )}>
              <Avatar src={user?.photoURL || undefined} fallback={user?.email?.charAt(0).toUpperCase() || 'U'} className="h-6 w-6 shrink-0 text-[10px]" />
              <div className={cn("flex flex-col overflow-hidden transition-all duration-200 text-left", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                <span className="truncate text-xs font-medium text-foreground">{profile?.full_name || user?.displayName || 'User'}</span>
                <span className="truncate text-[10px] text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Officer'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MOBILE MENU OVERLAY
          ═══════════════════════════════════════════════ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="fixed inset-y-0 left-0 z-50 w-[240px] bg-card border-r border-border flex flex-col transition-transform duration-200 animate-in slide-in-from-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between border-b border-border/30 px-4 shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-primary" style={{ color: branding.primary_color }}>
                <img src={logoUrl} className="h-8 w-8 shrink-0 object-contain" alt="Logo" />
                <span className="text-base tracking-tight text-foreground">{companyName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollableMenu className="pt-2">
              <NavMenu currentPage={currentPage} setPage={setPage} onItemClick={() => setIsMobileMenuOpen(false)} />
            </ScrollableMenu>

            <div className="mt-auto p-3 shrink-0 border-t border-border/30">
              <div className="flex items-center gap-2.5 rounded-xl p-2 bg-muted/20">
                <Avatar src={user?.photoURL || undefined} fallback={user?.email?.charAt(0).toUpperCase() || 'U'} className="h-8 w-8" />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-[13px] font-semibold">{profile?.full_name || user?.displayName || 'User'}</span>
                  <span className="truncate text-[11px] text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Officer'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════ */}
      <div className="flex flex-col h-full overflow-hidden relative">

        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 h-14 border-b border-border bg-background shrink-0 z-30 sticky top-0">
          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden -ml-1" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>

          {/* Page title */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            <h1 className="text-sm font-semibold capitalize tracking-tight text-foreground truncate">
              {pageTitleMap[currentPage] || currentPage.replace('_', ' ')}
            </h1>

            {/* Search bar (desktop) */}
            <div className="hidden lg:flex items-center max-w-sm w-full ml-auto" data-tour="search">
              <button
                onClick={() => setIsCommandOpen(true)}
                className="group flex w-full items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-300"
                title="Search (Cmd+K)"
              >
                <Search className="h-3.5 w-3.5 shrink-0 group-hover:text-primary transition-colors" />
                <span className="flex-1 text-left truncate text-xs">Search officers, sites…</span>
                <kbd className="inline-flex h-5 items-center gap-0.5 rounded bg-background/50 border border-border/30 px-1.5 font-mono text-[10px] font-bold">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell />
            <div className="px-0.5">
              <AnimatedDarkModeToggle
                isDark={theme === 'dark'}
                onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                size="sm"
              />
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/15 px-4 pt-3 pb-8 lg:px-6 lg:pt-4 xl:px-8 xl:pt-5 transition-colors duration-300">
          <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-10">
            {children}
          </div>
        </main>
      </div>

        <QuickActionDock
          onNavigate={setPage}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
        />

        <OnboardingFlow
          steps={onboardingSteps}
          isOpen={showOnboarding}
          onClose={dismissOnboarding}
          storageKey="guardian_onboarding_completed"
        />

        <KeyboardShortcutsHelp
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </div>
    </ActivityFeedProvider>
  );
}
