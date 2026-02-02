
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
  Package
} from 'lucide-react';
import { Avatar, Button, cn } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { CommandPalette } from './CommandPalette';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className={cn("h-4 w-4", active && "text-primary dark:text-primary-foreground")} />
      {label}
    </button>
  );
}

function NavMenu({ currentPage, setPage, onItemClick }: { currentPage: string, setPage: (p: string) => void, onItemClick?: () => void }) {
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
    <nav className="grid items-start px-3 text-sm font-medium lg:px-4 gap-1 pb-4">
      <NavItem icon={LayoutDashboard} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => handleClick('dashboard')} />
      <NavItem icon={CalendarDays} label="Schedule" active={currentPage === 'schedule'} onClick={() => handleClick('schedule')} />
      {!isClient && <NavItem icon={Clock} label="Timesheets" active={currentPage === 'timesheets'} onClick={() => handleClick('timesheets')} />}

      {showOfficers && <NavItem icon={Users} label="Officers" active={currentPage === 'officers'} onClick={() => handleClick('officers')} />}
      {showClients && <NavItem icon={Building2} label="Clients & Sites" active={currentPage === 'clients'} onClick={() => handleClick('clients')} />}
      {showAccounting && <NavItem icon={Banknote} label="Accounting" active={currentPage === 'accounting'} onClick={() => handleClick('accounting')} />}
      {showAccounting && <NavItem icon={Package} label="Resources" active={currentPage === 'resources'} onClick={() => handleClick('resources')} />}

      <NavItem icon={FileText} label="Reports" active={currentPage === 'reports'} onClick={() => handleClick('reports')} />

      {showFeedback && <NavItem icon={MessageSquare} label="Feedback" active={currentPage === 'feedback'} onClick={() => handleClick('feedback')} />}
      {showAudit && <NavItem icon={Activity} label="Audit Logs" active={currentPage === 'audit'} onClick={() => handleClick('audit')} />}

      {showSettings && <NavItem icon={Settings} label="Settings" active={currentPage === 'settings'} onClick={() => handleClick('settings')} />}
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
        className={cn("flex-1 overflow-y-auto no-scrollbar", className)}
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

export function Layout({ children, currentPage, setPage }: { children?: React.ReactNode, currentPage: string, setPage: (p: string) => void }) {
  const { user, profile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

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

  return (
    <div className="grid h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] overflow-hidden bg-background transition-colors duration-300">

      {/* COMMAND PALETTE */}
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} onNavigate={setPage} />

      {/* TOASTS */}
      <ToastContainer />

      {/* DESKTOP SIDEBAR */}
      <div className="hidden border-r bg-card md:block h-full overflow-hidden border-border flex-col shadow-sm z-20">
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6 shrink-0 bg-card border-border">
            <div className="flex items-center gap-2.5 font-bold text-primary">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl tracking-tight text-foreground">Guardian</span>
            </div>
          </div>

          <ScrollableMenu className="py-6">
            <div className="px-6 mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>
            </div>
            <NavMenu currentPage={currentPage} setPage={setPage} />
          </ScrollableMenu>

          <div className="mt-auto p-4 shrink-0 border-t border-border bg-card">
            <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
              <Avatar src={user?.photoURL || undefined} fallback={user?.email?.charAt(0).toUpperCase() || 'U'} className="h-9 w-9" />
              <div className="flex flex-col overflow-hidden">
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
              <div className="flex items-center gap-2 font-bold text-primary">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-lg tracking-tight text-foreground">Guardian</span>
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
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-6 shrink-0 z-10 transition-colors duration-300 sticky top-0">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="w-full flex-1 flex items-center gap-2">
            <h1 className="text-xl font-bold capitalize tracking-tight text-foreground">{currentPage.replace('_', ' ')}</h1>
            <div className="hidden md:flex items-center ml-4">
              <button
                onClick={() => setIsCommandOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Command className="h-3 w-3" />
                <span className="mr-4">Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
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
    </div>
  );
}
