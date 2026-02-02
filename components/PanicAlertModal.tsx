/**
 * PanicAlertModal Component
 * Full-screen overlay for emergency panic alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle,
    Phone,
    MapPin,
    Clock,
    User,
    CheckCircle,
    MessageSquare,
    X
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Button,
    Input,
    Label
} from './ui';
import type { PanicAlert, Officer, Site } from '../lib/types';
import { acknowledgePanicAlert, resolvePanicAlert } from '../lib/realtime';

interface PanicAlertModalProps {
    alert: PanicAlert | null;
    officer?: Officer | null;
    site?: Site | null;
    currentUserId: string;
    onClose: () => void;
}

export function PanicAlertModal({
    alert,
    officer,
    site,
    currentUserId,
    onClose
}: PanicAlertModalProps) {
    const [isAcknowledging, setIsAcknowledging] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [notes, setNotes] = useState('');
    const [pulseActive, setPulseActive] = useState(true);

    // Pulse animation control
    useEffect(() => {
        if (alert?.status === 'active') {
            const interval = setInterval(() => {
                setPulseActive(p => !p);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [alert?.status]);

    const handleAcknowledge = useCallback(async () => {
        if (!alert) return;
        setIsAcknowledging(true);
        try {
            await acknowledgePanicAlert(alert.id, currentUserId);
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        } finally {
            setIsAcknowledging(false);
        }
    }, [alert, currentUserId]);

    const handleResolve = useCallback(async () => {
        if (!alert) return;
        setIsResolving(true);
        try {
            await resolvePanicAlert(alert.id, notes || undefined);
            onClose();
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        } finally {
            setIsResolving(false);
        }
    }, [alert, notes, onClose]);

    const openMaps = useCallback(() => {
        if (!alert?.location) return;
        const { lat, lng } = alert.location;
        window.open(
            `https://www.google.com/maps?q=${lat},${lng}`,
            '_blank'
        );
    }, [alert?.location]);

    const callOfficer = useCallback(() => {
        if (!officer?.phone) return;
        window.open(`tel:${officer.phone}`);
    }, [officer?.phone]);

    if (!alert) return null;

    const isActive = alert.status === 'active';
    const isAcknowledged = alert.status === 'acknowledged';

    return (
        <Dialog open={!!alert} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                {/* Header with status color */}
                <div
                    className={`
            ${isActive ? 'bg-red-600' : isAcknowledged ? 'bg-amber-500' : 'bg-green-600'}
            ${isActive && pulseActive ? 'animate-pulse' : ''}
            text-white p-6
          `}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-full">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-white mb-1">
                                {isActive ? 'PANIC ALERT' : isAcknowledged ? 'Alert Acknowledged' : 'Alert Resolved'}
                            </DialogTitle>
                            <p className="text-white/80 text-sm">
                                {isActive
                                    ? 'Officer requires immediate assistance'
                                    : isAcknowledged
                                        ? 'Response in progress'
                                        : 'Situation resolved'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Officer Info */}
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <div className="h-12 w-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                            {officer?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                                {officer?.full_name || 'Unknown Officer'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Badge: {officer?.badge_number || 'N/A'}
                            </p>
                        </div>
                        {officer?.phone && (
                            <Button variant="outline" size="sm" onClick={callOfficer}>
                                <Phone className="h-4 w-4 mr-2" />
                                Call
                            </Button>
                        )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            Location
                        </Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
                                {alert.location.lat.toFixed(6)}, {alert.location.lng.toFixed(6)}
                            </div>
                            <Button variant="outline" size="sm" onClick={openMaps}>
                                Open Maps
                            </Button>
                        </div>
                        {site && (
                            <p className="text-sm text-muted-foreground">
                                Near: {site.name}
                            </p>
                        )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                            Alert triggered: {new Date(alert.timestamp).toLocaleString()}
                        </span>
                    </div>

                    {/* Acknowledged info */}
                    {alert.acknowledged_at && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>
                                Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Notes (for resolve) */}
                    {isAcknowledged && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <MessageSquare className="h-4 w-4" />
                                Resolution Notes
                            </Label>
                            <Input
                                placeholder="Enter notes about how the situation was resolved..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="border-t p-4 flex justify-end gap-2">
                    {isActive && (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            <Button
                                onClick={handleAcknowledge}
                                disabled={isAcknowledging}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
                            </Button>
                        </>
                    )}
                    {isAcknowledged && (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            <Button
                                onClick={handleResolve}
                                disabled={isResolving}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {isResolving ? 'Resolving...' : 'Mark Resolved'}
                            </Button>
                        </>
                    )}
                    {alert.status === 'resolved' && (
                        <Button onClick={onClose}>Close</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
