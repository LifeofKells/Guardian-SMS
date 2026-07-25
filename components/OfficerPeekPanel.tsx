import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';
import { Avatar, Badge, Button, cn } from './ui';
import { SlidePanel } from './SlidePanel';
import type { Officer, Shift, TimeEntry } from '../lib/types';
import {
    BadgeCheck,
    Calendar,
    Clock,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Shield,
    Star,
    User,
    X,
    ChevronRight,
    AlertCircle,
    Briefcase,
} from 'lucide-react';

interface OfficerPeekPanelProps {
    officerId: string | null;
    onClose: () => void;
    onNavigateToProfile?: (officerId: string) => void;
    onSendMessage?: (officerId: string) => void;
    onAssignShift?: (officerId: string) => void;
}

export function OfficerPeekPanel({
    officerId,
    onClose,
    onNavigateToProfile,
    onSendMessage,
    onAssignShift,
}: OfficerPeekPanelProps) {
    const { organization } = useAuth();
    const isOpen = !!officerId;

    // Fetch officer data
    const { data: officers = [] } = useQuery({
        queryKey: ['officers', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.officers.select(organization.id);
            return data || [];
        },
    });

    // Fetch shifts for this officer
    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.shifts.select(organization.id);
            return data || [];
        },
    });

    // Fetch time entries for this officer
    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time_entries', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.time_entries.select(organization.id);
            return data || [];
        },
    });

    // Fetch sites for showing current assignment
    const { data: sites = [] } = useQuery({
        queryKey: ['sites', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.sites.select(organization.id);
            return data || [];
        },
    });

    const officer = officers.find((o) => o.id === officerId) || null;

    // Find officer's recent shifts
    const officerShifts = shifts
        .filter((s) => s.officer_id === officerId)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    // Current/upcoming shift
    const now = new Date();
    const currentShift = officerShifts.find((s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        return now >= start && now <= end;
    });

    const nextShift = officerShifts.find((s) => {
        return new Date(s.start_time) > now && s.status !== 'completed';
    });

    // Hours this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const officerEntries = timeEntries.filter(
        (e) => e.officer_id === officerId && new Date(e.clock_in) >= weekStart
    );
    const hoursThisWeek = officerEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // Cert status
    const certs = officer?.certifications || [];
    const expiredCerts = certs.filter((c) => c.status === 'expired');
    const expiringCerts = certs.filter((c) => {
        if (c.status !== 'active') return false;
        const daysUntil = (new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntil <= 30 && daysUntil > 0;
    });

    // Find site name for current shift
    const currentSite = currentShift ? sites.find((s) => s.id === currentShift.site_id) : null;
    const nextSite = nextShift ? sites.find((s) => s.id === nextShift.site_id) : null;

    if (!officer && isOpen) {
        return (
            <SlidePanel
                open={isOpen}
                onOpenChange={() => onClose()}
                title="Officer Details"
                variant="details"
                width="md"
            >
                <div className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground text-sm">Officer not found.</p>
                </div>
            </SlidePanel>
        );
    }

    if (!officer) return null;

    const statusColor = {
        active: 'bg-emerald-500',
        onboarding: 'bg-amber-500',
        terminated: 'bg-red-500',
    }[officer.employment_status] || 'bg-gray-500';

    return (
        <SlidePanel
            open={isOpen}
            onOpenChange={() => onClose()}
            title=""
            width="md"
            variant="details"
            footer={
                <div className="flex items-center gap-2 flex-wrap">
                    {onSendMessage && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => onSendMessage(officer.id)}
                        >
                            <MessageSquare className="h-4 w-4" /> Message
                        </Button>
                    )}
                    {onAssignShift && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => onAssignShift(officer.id)}
                        >
                            <Calendar className="h-4 w-4" /> Assign Shift
                        </Button>
                    )}
                    {onNavigateToProfile && (
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-1.5 ml-auto"
                            onClick={() => onNavigateToProfile(officer.id)}
                        >
                            View Full Profile <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            }
        >
            {/* Officer Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                    <Avatar
                        src={officer.image_url || undefined}
                        fallback={officer.full_name?.charAt(0)?.toUpperCase() || 'O'}
                        className="h-16 w-16"
                    />
                    <div
                        className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background',
                            currentShift ? 'bg-emerald-500 animate-pulse' : statusColor
                        )}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground truncate">{officer.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                            variant={
                                officer.employment_status === 'active'
                                    ? 'success'
                                    : officer.employment_status === 'onboarding'
                                        ? 'warning'
                                        : 'destructive'
                            }
                            className="capitalize"
                        >
                            {currentShift ? '● On Duty' : officer.employment_status}
                        </Badge>
                        {officer.badge_number && (
                            <Badge variant="outline" className="text-[10px]">
                                #{officer.badge_number}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-6">
                {officer.email && (
                    <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate text-foreground">{officer.email}</span>
                    </div>
                )}
                {officer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{officer.phone}</span>
                    </div>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl border border-border bg-card/60 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Hours This Week
                    </div>
                    <p className="text-xl font-bold text-foreground">{hoursThisWeek.toFixed(1)}<span className="text-xs font-normal text-muted-foreground"> hrs</span></p>
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Briefcase className="h-3.5 w-3.5" /> Shifts Assigned
                    </div>
                    <p className="text-xl font-bold text-foreground">{officerShifts.filter((s) => s.status !== 'completed').length}<span className="text-xs font-normal text-muted-foreground"> upcoming</span></p>
                </div>
            </div>

            {/* Current Assignment */}
            {currentShift && (
                <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Assignment</p>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-sm font-semibold text-foreground">{currentSite?.name || 'Unknown Site'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                            {new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {new Date(currentShift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            )}

            {/* Next Shift */}
            {!currentShift && nextShift && (
                <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Shift</p>
                    <div className="rounded-xl border border-border bg-card/60 p-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-semibold text-foreground">{nextSite?.name || 'Unassigned'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                            {new Date(nextShift.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' at '}
                            {new Date(nextShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            )}

            {/* Skills */}
            {officer.skills && officer.skills.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                        {officer.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs capitalize">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Certifications */}
            {certs.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certifications</p>
                    <div className="space-y-2">
                        {certs.slice(0, 4).map((cert) => {
                            const isExpired = cert.status === 'expired';
                            const daysUntil = (new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                            const isExpiring = !isExpired && daysUntil <= 30 && daysUntil > 0;
                            return (
                                <div
                                    key={cert.id}
                                    className={cn(
                                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                                        isExpired
                                            ? 'border-red-500/30 bg-red-500/10'
                                            : isExpiring
                                                ? 'border-amber-500/30 bg-amber-500/10'
                                                : 'border-border bg-card/60'
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {isExpired ? (
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                        ) : (
                                            <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                        )}
                                        <span className="truncate text-foreground">{cert.name}</span>
                                    </div>
                                    <Badge
                                        variant={isExpired ? 'destructive' : isExpiring ? 'warning' : 'outline'}
                                        className="text-[10px] shrink-0"
                                    >
                                        {isExpired
                                            ? 'Expired'
                                            : isExpiring
                                                ? `${Math.ceil(daysUntil)}d left`
                                                : 'Active'}
                                    </Badge>
                                </div>
                            );
                        })}
                        {certs.length > 4 && (
                            <p className="text-xs text-muted-foreground text-center">+{certs.length - 4} more</p>
                        )}
                    </div>
                </div>
            )}

            {/* Cert Warnings */}
            {(expiredCerts.length > 0 || expiringCerts.length > 0) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        Certification Alert
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {expiredCerts.length > 0 && `${expiredCerts.length} expired. `}
                        {expiringCerts.length > 0 && `${expiringCerts.length} expiring within 30 days.`}
                    </p>
                </div>
            )}
        </SlidePanel>
    );
}

// Hook for using the peek panel
export function useOfficerPeek() {
    const [peekOfficerId, setPeekOfficerId] = useState<string | null>(null);

    const openPeek = (officerId: string) => setPeekOfficerId(officerId);
    const closePeek = () => setPeekOfficerId(null);

    return { peekOfficerId, openPeek, closePeek };
}

// Clickable officer name component that triggers peek
export function OfficerNameLink({
    officerId,
    name,
    onPeek,
    className,
}: {
    officerId: string;
    name: string;
    onPeek: (id: string) => void;
    className?: string;
}) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onPeek(officerId);
            }}
            className={cn(
                'text-sm font-medium text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors cursor-pointer',
                className
            )}
            title={`View ${name}'s details`}
        >
            {name}
        </button>
    );
}

export default OfficerPeekPanel;
