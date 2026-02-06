/**
 * AlertBanner Component
 * Dismissible alert banner for critical events
 */

import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Bell, MapPin, Phone } from 'lucide-react';
import { Button } from './ui';

interface AlertBannerProps {
    key?: React.Key;
    type: 'panic' | 'geofence' | 'info';
    title: string;
    message: string;
    officerName?: string;
    timestamp?: string;
    onDismiss?: () => void;
    onAction?: () => void;
    actionLabel?: string;
    autoPlaySound?: boolean;
}

export function AlertBanner({
    type,
    title,
    message,
    officerName,
    timestamp,
    onDismiss,
    onAction,
    actionLabel = 'View Details',
    autoPlaySound = true
}: AlertBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    // Play alert sound on mount
    useEffect(() => {
        if (autoPlaySound && type === 'panic') {
            // Create a simple beep sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 880; // High pitch for urgency
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;

                oscillator.start();

                // Three short beeps
                setTimeout(() => oscillator.stop(), 200);
            } catch (e) {
                // Audio not supported or blocked
            }
        }
    }, [autoPlaySound, type]);

    if (!isVisible) return null;

    const getStyles = () => {
        switch (type) {
            case 'panic':
                return {
                    bg: 'bg-red-600',
                    border: 'border-red-700',
                    pulse: 'animate-pulse',
                    icon: <AlertTriangle className="h-5 w-5" />
                };
            case 'geofence':
                return {
                    bg: 'bg-amber-500',
                    border: 'border-amber-600',
                    pulse: '',
                    icon: <MapPin className="h-5 w-5" />
                };
            default:
                return {
                    bg: 'bg-blue-600',
                    border: 'border-blue-700',
                    pulse: '',
                    icon: <Bell className="h-5 w-5" />
                };
        }
    };

    const styles = getStyles();

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss?.();
    };

    return (
        <div
            className={`
        ${styles.bg} ${styles.border} ${styles.pulse}
        text-white px-4 py-3 rounded-lg shadow-lg border
        flex items-center justify-between gap-4
        animate-in slide-in-from-top-2 duration-300
      `}
        >
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-full">
                    {styles.icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{title}</span>
                        {officerName && (
                            <span className="text-white/80">• {officerName}</span>
                        )}
                    </div>
                    <p className="text-sm text-white/90">{message}</p>
                    {timestamp && (
                        <p className="text-xs text-white/70 mt-0.5">
                            {new Date(timestamp).toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {type === 'panic' && (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white text-red-600 hover:bg-white/90"
                    >
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                    </Button>
                )}
                {onAction && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onAction}
                        className="bg-white/20 text-white hover:bg-white/30"
                    >
                        {actionLabel}
                    </Button>
                )}
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * AlertStack - Container for multiple alerts
 */
interface AlertStackProps {
    children: React.ReactNode;
}

export function AlertStack({ children }: AlertStackProps) {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-lg w-full">
            {children}
        </div>
    );
}
