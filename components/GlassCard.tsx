/**
 * Glass Card Components
 * Premium glassmorphism UI elements with frosted glass effects
 */

import React from 'react';
import { cn } from './ui';

// ============================================
// GLASS CARD
// ============================================
type GlassCardProps = React.PropsWithChildren<{
    className?: string;
    variant?: 'default' | 'solid' | 'panel' | 'gradient';
    glow?: boolean;
    hoverLift?: boolean;
}> & React.HTMLAttributes<HTMLDivElement>;

export function GlassCard({
    className,
    variant = 'default',
    glow = false,
    hoverLift = false,
    children,
    ...props
}: GlassCardProps) {
    const variants = {
        default: 'glass-card',
        solid: 'glass',
        panel: 'glass-panel',
        gradient: 'glass-gradient'
    };

    return (
        <div
            className={cn(
                'rounded-2xl p-6 transition-all duration-300',
                variants[variant],
                glow && 'glass-glow',
                hoverLift && 'hover-lift',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// ============================================
// GLASS STAT CARD
// ============================================
interface GlassStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: { value: number; positive: boolean };
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}

export function GlassStatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    variant = 'default',
    className
}: GlassStatCardProps) {
    const variants = {
        default: 'glass-card',
        primary: 'glass-primary',
        success: 'glass-success',
        warning: 'glass-warning',
        danger: 'glass-danger'
    };

    const iconColors = {
        default: 'text-primary',
        primary: 'text-primary',
        success: 'text-emerald-500',
        warning: 'text-amber-500',
        danger: 'text-red-500'
    };

    return (
        <div
            className={cn(
                'rounded-2xl p-5 transition-all duration-300 hover-lift',
                variants[variant],
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium mt-1",
                            trend.positive ? "text-emerald-500" : "text-red-500"
                        )}>
                            <span>{trend.positive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                            <span className="text-muted-foreground ml-1">vs last week</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={cn(
                        "p-3 rounded-xl bg-white/50 dark:bg-white/10",
                        iconColors[variant]
                    )}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// GLASS BUTTON
// ============================================
type GlassButtonProps = React.PropsWithChildren<{
    className?: string;
    variant?: 'default' | 'primary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
}> & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function GlassButton({
    children,
    className,
    variant = 'default',
    size = 'md',
    icon,
    ...props
}: GlassButtonProps) {
    const variants = {
        default: 'glass-button text-foreground',
        primary: 'bg-primary/20 dark:bg-primary/30 backdrop-blur-md border border-primary/30 text-primary hover:bg-primary/30',
        danger: 'bg-red-500/20 dark:bg-red-500/30 backdrop-blur-md border border-red-500/30 text-red-500 hover:bg-red-500/30'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
                'transition-all duration-200 press-effect',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:opacity-50 disabled:pointer-events-none',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}

// ============================================
// GLASS INPUT
// ============================================
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
    ({ className, icon, ...props }, ref) => {
        return (
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {icon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        'w-full rounded-xl px-4 py-2.5 text-sm',
                        'bg-white/50 dark:bg-white/10 backdrop-blur-md',
                        'border border-white/30 dark:border-white/10',
                        'placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                        'transition-all duration-200',
                        icon && 'pl-10',
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);
GlassInput.displayName = 'GlassInput';

// ============================================
// GLASS BADGE
// ============================================
interface GlassBadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md';
    pulse?: boolean;
    className?: string;
}

export function GlassBadge({
    children,
    variant = 'default',
    size = 'md',
    pulse = false,
    className
}: GlassBadgeProps) {
    const variants = {
        default: 'bg-white/30 dark:bg-white/10 text-foreground border-white/20',
        primary: 'bg-primary/20 text-primary border-primary/30',
        success: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
        danger: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs'
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-semibold',
                'backdrop-blur-md border',
                variants[variant],
                sizes[size],
                pulse && 'animate-pulse',
                className
            )}
        >
            {children}
        </span>
    );
}

// ============================================
// GLASS PANEL (for larger areas)
// ============================================
type GlassPanelProps = React.PropsWithChildren<{
    className?: string;
    header?: React.ReactNode;
    footer?: React.ReactNode;
}> & React.HTMLAttributes<HTMLDivElement>;

export function GlassPanel({
    className,
    header,
    footer,
    children,
    ...props
}: GlassPanelProps) {
    return (
        <div
            className={cn(
                'rounded-2xl overflow-hidden',
                'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl',
                'border border-white/30 dark:border-white/10',
                'shadow-xl shadow-black/5',
                className
            )}
            {...props}
        >
            {header && (
                <div className="px-6 py-4 border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5">
                    {header}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 border-t border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5">
                    {footer}
                </div>
            )}
        </div>
    );
}

// ============================================
// GLASS MODAL
// ============================================
interface GlassModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function GlassModal({
    open,
    onClose,
    title,
    children,
    className
}: GlassModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal */}
            <div
                className={cn(
                    "relative w-full max-w-lg",
                    "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl",
                    "border border-white/30 dark:border-white/10",
                    "rounded-2xl shadow-2xl",
                    "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
                    className
                )}
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                {title && (
                    <div className="px-6 py-4 border-b border-white/20 dark:border-white/10">
                        <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ============================================
// GLASS TOOLTIP
// ============================================
interface GlassTooltipProps {
    content: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
}

export function GlassTooltip({ content, children, side = 'top' }: GlassTooltipProps) {
    const [show, setShow] = React.useState(false);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div
                    className={cn(
                        "absolute z-50 px-3 py-1.5 text-xs font-medium",
                        "bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900",
                        "backdrop-blur-md rounded-lg shadow-lg",
                        "whitespace-nowrap animate-in fade-in zoom-in-95 duration-150",
                        positions[side]
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
