/**
 * Micro-Animations Components
 * Premium UI enhancements: Success checkmarks, confetti, animated elements
 */

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from './ui';

// ============================================
// SUCCESS CHECKMARK
// ============================================
interface SuccessCheckmarkProps {
    show: boolean;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    onComplete?: () => void;
    className?: string;
}

export function SuccessCheckmark({
    show,
    size = 'md',
    color = 'currentColor',
    onComplete,
    className
}: SuccessCheckmarkProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            const timer = setTimeout(() => {
                onComplete?.();
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [show, onComplete]);

    if (!visible) return null;

    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16'
    };

    return (
        <div className={cn("inline-flex items-center justify-center animate-bounce-in", className)}>
            <svg
                className={cn(sizes[size])}
                viewBox="0 0 24 24"
                fill="none"
            >
                {/* Circle background */}
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    className="fill-emerald-500/20 stroke-emerald-500"
                    strokeWidth="2"
                />
                {/* Checkmark */}
                <path
                    d="M8 12.5l2.5 2.5 5-5"
                    className="check-animate stroke-emerald-500"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>
        </div>
    );
}

// ============================================
// CONFETTI CELEBRATION
// ============================================
interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    size: number;
}

interface ConfettiProps {
    show: boolean;
    duration?: number;
    particleCount?: number;
    colors?: string[];
    onComplete?: () => void;
}

export function Confetti({
    show,
    duration = 3000,
    particleCount = 50,
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    onComplete
}: ConfettiProps) {
    const [particles, setParticles] = useState<ConfettiPiece[]>([]);
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (show && !active) {
            setActive(true);
            const newParticles: ConfettiPiece[] = [];
            for (let i = 0; i < particleCount; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 100,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    delay: Math.random() * 500,
                    size: Math.random() * 8 + 4
                });
            }
            setParticles(newParticles);

            const timer = setTimeout(() => {
                setParticles([]);
                setActive(false);
                onComplete?.();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [show, active, particleCount, colors, duration, onComplete]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute top-0"
                    style={{
                        left: `${p.x}%`,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        animation: `confetti-fall ${duration}ms linear ${p.delay}ms forwards`,
                        transform: `rotate(${Math.random() * 360}deg)`
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// ANIMATED COUNTER (Enhanced)
// ============================================
interface AnimatedNumberProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
}

export function AnimatedNumber({
    value,
    duration = 1000,
    prefix = '',
    suffix = '',
    decimals = 0,
    className
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const startValue = displayValue;
        const diff = value - startValue;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = startValue + diff * easeOut;

            setDisplayValue(current);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <span className={cn("tabular-nums", className)}>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
    );
}

// ============================================
// PULSE RING (for live indicators)
// ============================================
interface PulseRingProps {
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function PulseRing({
    color = 'bg-emerald-500',
    size = 'md',
    className
}: PulseRingProps) {
    const sizes = {
        sm: 'h-2 w-2',
        md: 'h-3 w-3',
        lg: 'h-4 w-4'
    };

    return (
        <span className={cn("relative flex", sizes[size], className)}>
            <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                color
            )} />
            <span className={cn(
                "relative inline-flex rounded-full h-full w-full",
                color
            )} />
        </span>
    );
}

// ============================================
// SHIMMER LOADING EFFECT
// ============================================
interface ShimmerProps {
    className?: string;
    children?: React.ReactNode;
}

export function Shimmer({ className, children }: ShimmerProps) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            {children}
            <div className="absolute inset-0 animate-shimmer" />
        </div>
    );
}

// ============================================
// FLOATING ELEMENT
// ============================================
interface FloatingProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

export function Floating({ children, delay = 0, className }: FloatingProps) {
    return (
        <div
            className={cn("animate-float", className)}
            style={{ animationDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

// ============================================
// STAGGER CONTAINER
// ============================================
interface StaggerContainerProps {
    children: React.ReactNode;
    className?: string;
    show?: boolean;
}

export function StaggerContainer({ children, className, show = true }: StaggerContainerProps) {
    if (!show) return null;

    return (
        <div className={cn("stagger-children", className)}>
            {children}
        </div>
    );
}

// ============================================
// PRESS BUTTON (with micro-animation)
// ============================================
type PressButtonProps = React.PropsWithChildren<{
    className?: string;
    variant?: 'default' | 'glass' | 'glow';
    loading?: boolean;
    disabled?: boolean;
}> & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>;

export function PressButton({
    children,
    className,
    variant = 'default',
    loading,
    disabled,
    ...props
}: PressButtonProps) {
    const variants = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        glass: 'glass-button text-foreground',
        glow: 'bg-primary text-primary-foreground hover-glow'
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "transition-all duration-200 press-effect",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}

// ============================================
// SUCCESS TOAST ANIMATION
// ============================================
interface SuccessToastProps {
    show: boolean;
    message: string;
    onClose?: () => void;
}

export function SuccessToast({ show, message, onClose }: SuccessToastProps) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose?.();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl">
                <SuccessCheckmark show={true} size="sm" />
                <span className="text-sm font-medium text-foreground">{message}</span>
            </div>
        </div>
    );
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to trigger confetti celebration
 */
export function useConfetti() {
    const [showConfetti, setShowConfetti] = useState(false);

    const celebrate = useCallback(() => {
        setShowConfetti(true);
    }, []);

    const ConfettiComponent = useCallback(() => (
        <Confetti
            show={showConfetti}
            onComplete={() => setShowConfetti(false)}
        />
    ), [showConfetti]);

    return { celebrate, ConfettiComponent };
}

/**
 * Hook to show success feedback
 */
export function useSuccessFeedback() {
    const [showSuccess, setShowSuccess] = useState(false);
    const [message, setMessage] = useState('');

    const showFeedback = useCallback((msg: string = 'Success!') => {
        setMessage(msg);
        setShowSuccess(true);
    }, []);

    const SuccessComponent = useCallback(() => (
        <SuccessToast
            show={showSuccess}
            message={message}
            onClose={() => setShowSuccess(false)}
        />
    ), [showSuccess, message]);

    return { showFeedback, SuccessComponent };
}
