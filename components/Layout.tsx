
import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
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
  Menu,
  X,
  Activity,
  ChevronDown,
  Search,
  Command,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft
} from 'lucide-react';
import { Avatar, Button, cn, Tooltip } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { CommandPalette } from './CommandPalette';
import { OnboardingFlow, useOnboarding } from './OnboardingFlow';
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { AnimatedDarkModeToggle } from './AnimatedDarkModeToggle';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

function NavItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-xl transition-all duration-200 group relative",
        collapsed
          ? "w-10 h-10 justify-center mx-auto hover:bg-muted"
          : "w-full gap-3 px-3 py-2.5 hover:bg-muted/50",
        active
          ? collapsed
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn(
        "shrink-0 transition-all duration-200",
        collapsed ? "h-5 w-5" : "h-4 w-4",
        active && !collapsed && "text-primary dark:text-primary-foreground"
      )} />

      {!collapsed && (
        <span className="truncate">{label}</span>
      )}

      {/* Active Indicator (Left Bar) for Expanded/Collapsed or Pill? 
          Modern style usually is huge pill for expanded, square for collapsed. 
          We already did that with rounded-xl above.
      */}
      {active && !collapsed && (
        <div className="absolute left-0 h-6 w-1 rounded-r-full bg-primary opacity-0" /> // Optional accent
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

function NavMenu({ currentPage, setPage, onItemClick, collapsed }: { currentPage: string, setPage: (p: string) => void, onItemClick?: () => void, collapsed?: boolean }) {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';
  const isClient = profile?.role === 'client';

  const showOfficers = isAdmin;
  const showClients = isAdmin;
  const showAccounting = isAdmin;
  const showSettings = isAdmin || isClient;
  const showFeedback = isAdmin || isClient;
  const showAudit = isAdmin;

  const handleClick = (page: string) => {
    setPage(page);
    if (onItemClick) onItemClick();
  };

  return (
    <nav className={cn("grid items-start text-sm font-medium gap-1 pb-12 transition-all duration-300", collapsed ? "px-2" : "px-3 lg:px-4")}>
      <NavItem icon={LayoutDashboard} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => handleClick('dashboard')} collapsed={collapsed} />
      <NavItem icon={CalendarDays} label="Schedule" active={currentPage === 'schedule'} onClick={() => handleClick('schedule')} collapsed={collapsed} />
      {!isClient && <NavItem icon={Clock} label="Timesheets" active={currentPage === 'timesheets'} onClick={() => handleClick('timesheets')} collapsed={collapsed} />}

      {showOfficers && <NavItem icon={Users} label="Officers" active={currentPage === 'officers'} onClick={() => handleClick('officers')} collapsed={collapsed} />}
      {showClients && <NavItem icon={Building2} label="Clients & Sites" active={currentPage === 'clients'} onClick={() => handleClick('clients')} collapsed={collapsed} />}
      {showAccounting && <NavItem icon={Banknote} label="Accounting" active={currentPage === 'accounting'} onClick={() => handleClick('accounting')} collapsed={collapsed} />}
      {showAccounting && <NavItem icon={Package} label="Resources" active={currentPage === 'resources'} onClick={() => handleClick('resources')} collapsed={collapsed} />}

      {isAdmin && (
        <a
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 group relative text-muted-foreground hover:text-foreground",
            collapsed ? "w-10 h-10 justify-center mx-auto hover:bg-muted" : "w-full gap-3 px-3 py-2.5 hover:bg-muted/50"
          )}
        >
          <Building2 className={cn("shrink-0 h-4 w-4", collapsed && "h-5 w-5")} />
          {!collapsed && <span>Client Portal Hub</span>}
        </a>
      )}

      <NavItem icon={FileText} label="Reports" active={currentPage === 'reports'} onClick={() => handleClick('reports')} collapsed={collapsed} />

      {showFeedback && <NavItem icon={MessageSquare} label="Feedback" active={currentPage === 'feedback'} onClick={() => handleClick('feedback')} collapsed={collapsed} />}
      {showAudit && <NavItem icon={Activity} label="Audit Logs" active={currentPage === 'audit'} onClick={() => handleClick('audit')} collapsed={collapsed} />}

      {showSettings && <NavItem icon={Settings} label="Settings" active={currentPage === 'settings'} onClick={() => handleClick('settings')} collapsed={collapsed} />}
    </nav>
  );
}

/**
 * A wrapper component that adds visual scroll indicators (shadows + arrow)
 * when the content overflows the container.
 */
function ScrollableMenu({ children, className }: { children?: React.ReactNode, className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    setCanScrollUp(scrollTop > 0);
    // Use a small tolerance (1px) for calculation differences
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]); // Re-check if children change

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      {/* Top Gradient Shadow */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none transition-opacity duration-300",
          canScrollUp ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn("flex-1 h-0 overflow-y-auto custom-scrollbar min-h-0", className)}
      >
        {children}
      </div>

      {/* Bottom Gradient Shadow */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none transition-opacity duration-300 flex justify-center items-end pb-1",
          canScrollDown ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Animated Chevron Indicator */}
        <div className="text-muted-foreground/50 animate-bounce">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// --- TOAST CONTAINER ---
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 w-full bg-background border border-border shadow-lg rounded-lg p-4 animate-in slide-in-from-right-full fade-in duration-300"
        >
          {toast.type === 'success' && <div className="text-emerald-500 mt-0.5"><ShieldCheck className="h-5 w-5" /></div>}
          {toast.type === 'error' && <div className="text-red-500 mt-0.5"><Activity className="h-5 w-5" /></div>}
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{toast.title}</h4>
            {toast.description && <p className="text-xs text-muted-foreground mt-1">{toast.description}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ... imports ...

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
      title: 'Welcome to Guardian SMS',
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
    company_name: 'Guardian',
    logo_url: '/favicon.svg',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    accent_color: '#10b981',
  };

  // Use organization name as fallback if white_label name is missing but org exists
  const companyName = branding.company_name === 'Guardian' && organization?.name ? organization.name : branding.company_name;
  // If no specific logo url is provided for white label, default to standard one (or generic placeholder if it's a completely different org)
  // For this 'revamp', if it's the "Guardian" default, use favicon. If it's a custom org, maybe we simulate a logo or just text.
  const logoUrl = branding.logo_url || '/favicon.svg';

  // Apply branding colors to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;

    // Helper to convert hex to HSL for CSS custom properties
    const hexToHsl = (hex: string): string => {
      // Remove # if present
      hex = hex.replace('#', '');

      // Parse hex values
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

    // Apply primary color
    if (branding.primary_color) {
      const primaryHsl = hexToHsl(branding.primary_color);
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--primary-foreground', '0 0% 100%'); // White text on primary
    }

    // Apply accent color (used for success states, etc.)
    if (branding.accent_color) {
      const accentHsl = hexToHsl(branding.accent_color);
      root.style.setProperty('--accent', accentHsl);
    }

    // Update favicon if custom one is provided
    if (branding.favicon_url) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.favicon_url;
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    // Update document title if custom company name
    if (branding.company_name && branding.company_name !== 'Guardian') {
      document.title = `${branding.company_name} - Admin Portal`;
    }

    // Cleanup on unmount or when branding changes
    return () => {
      // Reset to defaults if needed (optional, usually not required)
    };
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
    <div className={cn(
      "grid h-screen w-full overflow-hidden bg-background transition-all duration-300 ease-in-out",
      isCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]"
    )}>

      {/* COMMAND PALETTE */}
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} onNavigate={setPage} />

      {/* TOASTS */}
      <ToastContainer />

      {/* DESKTOP SIDEBAR */}
      <div data-tour="sidebar" className={cn(
        "hidden border-r bg-card/70 backdrop-blur-xl md:flex h-full border-border flex-col shadow-sm z-20 transition-all duration-300 ease-in-out relative group/sidebar",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}>
        {/* Toggle Button - Floating on Border */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "absolute -right-3 top-9 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-lg flex items-center justify-center text-primary hover:bg-muted transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring hover:scale-110",
          )}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>

        <div className="flex h-full flex-col gap-2">
          <div className={cn(
            "flex h-16 items-center border-b shrink-0 bg-transparent border-border transition-all duration-300 overflow-hidden",
            isCollapsed ? "justify-center px-0" : "px-6"
          )}>
            <div className="flex items-center gap-3 font-bold text-primary" style={{ color: branding.primary_color }}>
              <img src={logoUrl} className="h-9 w-9 shrink-0 object-contain" alt="Logo" />
              <span className={cn(
                "text-xl tracking-tight text-foreground transition-all duration-300 whitespace-nowrap",
                isCollapsed ? "w-0 opacity-0 scale-95" : "w-auto opacity-100 scale-100"
              )}>
                {companyName}
              </span>
            </div>
          </div>

          <ScrollableMenu className="py-4">
            <div className={cn("transition-all duration-300 px-6 mb-2 overflow-hidden", isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100")}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>
            </div>
            <NavMenu currentPage={currentPage} setPage={setPage} collapsed={isCollapsed} />
          </ScrollableMenu>

          <div className="mt-auto p-4 shrink-0 border-t border-border bg-transparent">
            <div className={cn(
              "flex items-center gap-3 rounded-xl transition-all cursor-pointer border border-transparent hover:border-border hover:bg-muted/50",
              isCollapsed ? "p-0 justify-center h-10 w-10 mx-auto" : "p-3"
            )}>
              <Avatar src={user?.photoURL || undefined} fallback={user?.email?.charAt(0).toUpperCase() || 'U'} className="h-9 w-9 shrink-0" />
              <div className={cn("flex flex-col overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                <span className="truncate text-sm font-semibold text-foreground">{profile?.full_name || user?.displayName || 'User'}</span>
                <span className="truncate text-xs text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Officer'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="fixed inset-y-0 left-0 z-50 w-[260px] bg-card shadow-2xl border-r p-0 flex flex-col transition-transform duration-300 animate-in slide-in-from-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b px-4 shrink-0 bg-card">
              <div className="flex items-center gap-2 font-bold text-primary" style={{ color: branding.primary_color }}>
                <img src={logoUrl} className="h-8 w-8 shrink-0 object-contain" alt="Logo" />
                <span className="text-lg tracking-tight text-foreground">{companyName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollableMenu className="py-4">
              <NavMenu currentPage={currentPage} setPage={setPage} onItemClick={() => setIsMobileMenuOpen(false)} />
            </ScrollableMenu>

            <div className="mt-auto p-4 shrink-0 border-t">
              <div className="flex items-center gap-3 rounded-lg p-2 bg-muted/30">
                <Avatar src={user?.photoURL || undefined} fallback={user?.email?.charAt(0).toUpperCase() || 'U'} />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium">{profile?.full_name || user?.displayName || 'User'}</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Officer'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col h-full overflow-hidden relative">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-6 shrink-0 z-10 transition-all duration-300 sticky top-0">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>

          {/* SIDEBAR TOGGLE (DESKTOP) - Removed from here, moved to sidebar border */}
          <div className="w-full flex-1 flex items-center gap-2">
            <h1 className="text-xl font-bold capitalize tracking-tight text-foreground">{currentPage.replace('_', ' ')}</h1>
            <div className="hidden md:flex items-center ml-4" data-tour="search">
              <button
                onClick={() => setIsCommandOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Search (Cmd+K)"
              >
                <Command className="h-3 w-3" />
                <span className="mr-4">Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>
          </div>
          <div className="flex items-center px-2">
            <AnimatedDarkModeToggle
              isDark={theme === 'dark'}
              onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              size="sm"
            />
          </div>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 lg:p-8 transition-colors duration-300">
          <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-10">
            {children}
          </div>
        </main>
      </div>

      {/* ONBOARDING FLOW */}
      <OnboardingFlow
        steps={onboardingSteps}
        isOpen={showOnboarding}
        onClose={dismissOnboarding}
        storageKey="guardian_onboarding_completed"
      />

      {/* KEYBOARD SHORTCUTS HELP */}
      <KeyboardShortcutsHelp
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
