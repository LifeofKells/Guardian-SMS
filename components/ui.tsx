
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LucideIcon, X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- LABEL ---
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium leading-none tracking-wide uppercase text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 block",
        className
      )}
      {...props}
    />
  );
}

// --- SKELETON ---
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  loading?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, disabled, children, ...props }, ref) => {
    const variants = {
      default: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow active:shadow-none font-medium',
      outline: 'border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs',
      ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow',
      secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-700/80',
      link: 'text-teal-600 dark:text-teal-400 underline-offset-4 hover:underline p-0 h-auto',
    };
    const sizes = {
      sm: 'h-8 rounded-lg px-3 text-xs font-medium',
      default: 'h-9.5 rounded-xl px-4 py-2 text-sm font-medium',
      lg: 'h-11 rounded-xl px-6 text-sm font-semibold',
      icon: 'h-8.5 w-8.5 rounded-lg shrink-0',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button"

// --- CARD ---
type CardProps = React.PropsWithChildren<{
  className?: string;
  hoverLift?: boolean;
}> & React.HTMLAttributes<HTMLDivElement>;
export function Card({ className, hoverLift = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-slate-950/5 dark:ring-white/5 transition-all duration-200',
        hoverLift && 'hover:shadow-[0_10px_25px_-5px_rgba(15,23,42,0.08),0_8px_10px_-6px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer',
        className
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100', className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }) {
  const variants = {
    default: 'border-teal-200/80 bg-teal-50 text-teal-700 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300',
    secondary: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    destructive: 'border-red-200/80 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300',
    outline: 'border-slate-200/90 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
    success: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    warning: 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300',
  };
  return (
    <div className={cn('inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors shadow-2xs', variants[variant], className)} {...props} />
  );
}

// --- AVATAR ---
export function Avatar({ src, fallback, className }: { src?: string; fallback: string; className?: string }) {
  return (
    <div className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-900 shadow-2xs', className)}>
      {src ? (
        <img className="aspect-square h-full w-full object-cover" src={src} alt="Avatar" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs tracking-wider">{fallback}</div>
      )}
    </div>
  );
}

// --- INPUT ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9.5 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:border-teal-500/80 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// --- TABS (Refactored to use Context) ---
const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (value: string) => void;
} | null>(null);

export function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  children
}: {
  className?: string,
  defaultValue: string,
  value?: string,
  onValueChange?: (value: string) => void,
  children?: React.ReactNode
}) {
  const [internalActiveTab, setInternalActiveTab] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalActiveTab;

  const setActiveTab = (nextValue: string) => {
    if (!isControlled) {
      setInternalActiveTab(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-0 border-b border-slate-200 text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ className, value, children }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-3 pb-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-b-2 -mb-px",
        isActive ? "border-primary text-foreground" : "border-transparent hover:text-foreground hover:border-muted-foreground/30",
        className
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ className, value, children }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      {children}
    </div>
  );
}

// --- DIALOG (MODAL) ---
export function Dialog({ open, onOpenChange, children, className, overlayClassName, showClose = true }: {
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  children?: React.ReactNode,
  className?: string,
  overlayClassName?: string,
  showClose?: boolean
}) {
  if (!open) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150", overlayClassName)}
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className={cn("relative bg-card w-full max-w-lg rounded-lg border border-border flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 zoom-in-95 duration-150 ease-out", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {showClose && (
          <button
            className="absolute right-4 top-4 rounded-lg p-2 opacity-50 ring-offset-background transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus-visible:ring-ring focus:ring-offset-2 z-20"
            onClick={() => onOpenChange?.(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-2", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xl font-bold leading-none tracking-tight text-foreground", className)} {...props} />;
}

export function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props}>{children}</div>;
}

// --- SHEET (DRAWER) ---
export function Sheet({ open, onOpenChange, children }: { open?: boolean, onOpenChange?: (open: boolean) => void, children?: React.ReactNode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in duration-150" onClick={() => onOpenChange?.(false)}>
      <div
        className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col animate-in slide-in-from-right duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-accent focus:outline-none z-10 p-1.5"
          onClick={() => onOpenChange?.(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 p-6 pb-4 border-b border-border/50", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-bold text-foreground", className)} {...props} />;
}

export function SheetContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-6", className)} {...props}>{children}</div>;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 border-t border-border bg-muted/10", className)} {...props} />;
}

// --- TOOLTIP (Simple Pure CSS/React Implementation) ---
export function Tooltip({ children, content, side = 'right' }: { children: React.ReactNode, content: string, side?: 'top' | 'right' | 'bottom' | 'left' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={cn(
          "absolute z-50 px-2 py-1 text-xs font-medium bg-foreground text-background rounded-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 pointer-events-none",
          side === 'right' && "left-full ml-2",
          side === 'left' && "right-full mr-2",
          side === 'top' && "bottom-full mb-2 left-1/2 -translate-x-1/2",
          side === 'bottom' && "top-full mt-2 left-1/2 -translate-x-1/2"
        )}>
          {content}
        </div>
      )}
    </div>
  );
}

// --- RE-EXPORTS FOR NEW FEATURES ---
export { useBreadcrumbs } from '../contexts/BreadcrumbContext';
export { BreadcrumbNav } from './BreadcrumbNav';
export { useTabPersistence, useMultiTabPersistence } from '../hooks/useTabPersistence';
export { SlidePanel, FilterPanel, DetailsPanel, EditPanel } from './SlidePanel';
export { PageTransition, AnimatedPage, StaggeredList, CrossFade } from './PageTransition';
export {
  CollapsibleSection,
  Accordion,
  ExpandableDetails,
  FormSection,
  ShowMore,
  InfoDisclosure
} from './ProgressiveDisclosure';
export {
  NotificationProvider,
  NotificationBell,
  useNotifications,
  useDemoNotifications
} from './NotificationCenter';
export type { Notification } from './NotificationCenter';
