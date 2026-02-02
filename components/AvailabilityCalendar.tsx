/**
 * Availability Calendar Component
 * Officers submit availability windows for scheduling
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Label } from './ui';
import { ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';
import type { Availability } from '../lib/types';

interface AvailabilityCalendarProps {
    officerId: string;
    availability: Availability[];
    onUpdate: (updates: Availability[]) => void;
    readOnly?: boolean;
    month?: Date;
}

export function AvailabilityCalendar({
    officerId,
    availability,
    onUpdate,
    readOnly = false,
    month: initialMonth
}: AvailabilityCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Availability>>({});

    // Get days in month
    const days = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();

        const result: (Date | null)[] = [];

        // Padding for days before month starts
        for (let i = 0; i < startPadding; i++) {
            result.push(null);
        }

        // Days in month
        for (let d = 1; d <= lastDay.getDate(); d++) {
            result.push(new Date(year, month, d));
        }

        return result;
    }, [currentMonth]);

    // Create availability lookup by date
    const availabilityByDate = useMemo(() => {
        const lookup: Record<string, Availability> = {};
        availability.forEach(a => {
            lookup[a.date] = a;
        });
        return lookup;
    }, [availability]);

    const formatDateKey = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const handleDayClick = (date: Date) => {
        if (readOnly) return;

        const dateKey = formatDateKey(date);
        setSelectedDate(dateKey);

        const existing = availabilityByDate[dateKey];
        if (existing) {
            setEditData({
                available: existing.available,
                start_time: existing.start_time,
                end_time: existing.end_time,
                notes: existing.notes
            });
        } else {
            setEditData({ available: true });
        }
    };

    const handleQuickToggle = (date: Date, available: boolean) => {
        if (readOnly) return;

        const dateKey = formatDateKey(date);
        const existing = availabilityByDate[dateKey];

        const update: Availability = {
            id: existing?.id || `${officerId}_${dateKey}`,
            officer_id: officerId,
            date: dateKey,
            available,
            start_time: existing?.start_time,
            end_time: existing?.end_time,
            notes: existing?.notes
        };

        onUpdate([update]);
    };

    const handleSave = () => {
        if (!selectedDate) return;

        const update: Availability = {
            id: availabilityByDate[selectedDate]?.id || `${officerId}_${selectedDate}`,
            officer_id: officerId,
            date: selectedDate,
            available: editData.available ?? true,
            start_time: editData.start_time,
            end_time: editData.end_time,
            notes: editData.notes
        };

        onUpdate([update]);
        setSelectedDate(null);
        setEditData({});
    };

    const navigateMonth = (delta: number) => {
        setCurrentMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + delta);
            return next;
        });
    };

    const getDayStatus = (date: Date): 'available' | 'unavailable' | 'partial' | 'unset' => {
        const avail = availabilityByDate[formatDateKey(date)];
        if (!avail) return 'unset';
        if (!avail.available) return 'unavailable';
        if (avail.start_time || avail.end_time) return 'partial';
        return 'available';
    };

    const getDayClasses = (date: Date | null): string => {
        if (!date) return 'invisible';

        const status = getDayStatus(date);
        const isToday = formatDateKey(date) === formatDateKey(new Date());
        const isSelected = formatDateKey(date) === selectedDate;
        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

        let base = 'h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative';

        if (isPast) {
            base += ' opacity-50 cursor-not-allowed';
        } else if (!readOnly) {
            base += ' cursor-pointer hover:ring-2 hover:ring-primary/50';
        }

        if (isSelected) {
            base += ' ring-2 ring-primary';
        }

        if (isToday) {
            base += ' font-bold';
        }

        switch (status) {
            case 'available':
                return base + ' bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            case 'unavailable':
                return base + ' bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
            case 'partial':
                return base + ' bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
            default:
                return base + ' bg-muted hover:bg-muted/80';
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Availability</CardTitle>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateMonth(-1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateMonth(1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Legend */}
                <div className="flex gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-green-500" />
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-amber-500" />
                        <span>Partial</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-red-500" />
                        <span>Unavailable</span>
                    </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((date, i) => (
                        <div key={i} className="flex justify-center">
                            {date ? (
                                <button
                                    className={getDayClasses(date)}
                                    onClick={() => handleDayClick(date)}
                                    disabled={readOnly || date < new Date(new Date().setHours(0, 0, 0, 0))}
                                >
                                    {date.getDate()}
                                    {getDayStatus(date) === 'partial' && (
                                        <Clock className="h-2 w-2 absolute bottom-1 right-1" />
                                    )}
                                </button>
                            ) : (
                                <div className="h-10 w-10" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Edit panel */}
                {selectedDate && !readOnly && (
                    <div className="mt-4 p-4 bg-muted rounded-lg space-y-3 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </h4>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant={editData.available ? 'default' : 'outline'}
                                    onClick={() => setEditData(prev => ({ ...prev, available: true }))}
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Available
                                </Button>
                                <Button
                                    size="sm"
                                    variant={editData.available === false ? 'destructive' : 'outline'}
                                    onClick={() => setEditData(prev => ({ ...prev, available: false }))}
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Unavailable
                                </Button>
                            </div>
                        </div>

                        {editData.available && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">From</Label>
                                    <Input
                                        type="time"
                                        value={editData.start_time || ''}
                                        onChange={e => setEditData(prev => ({ ...prev, start_time: e.target.value }))}
                                        placeholder="Start time"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">To</Label>
                                    <Input
                                        type="time"
                                        value={editData.end_time || ''}
                                        onChange={e => setEditData(prev => ({ ...prev, end_time: e.target.value }))}
                                        placeholder="End time"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs">Notes (optional)</Label>
                            <Input
                                value={editData.notes || ''}
                                onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="e.g., Doctor's appointment in morning"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedDate(null); setEditData({}); }}
                            >
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                                Save
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
