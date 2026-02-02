/**
 * Schedule Validation Service
 * Detect conflicts and validate shift assignments
 */

import type { Shift, Officer, Site, Availability } from './types';

export interface ConflictResult {
    hasConflict: boolean;
    type: 'overlap' | 'rest_period' | 'certification' | 'availability' | 'overtime';
    severity: 'warning' | 'error';
    message: string;
    conflictingShift?: Shift;
}

/**
 * Parse time strings for comparison
 */
function parseDateTime(dateTimeStr: string): Date {
    return new Date(dateTimeStr);
}

/**
 * Check if two time ranges overlap
 */
function doTimeRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
): boolean {
    return start1 < end2 && start2 < end1;
}

/**
 * Calculate hours between two dates
 */
function getHoursBetween(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Detect all conflicts for a proposed shift assignment
 */
export function detectConflicts(
    newShift: Shift,
    existingShifts: Shift[],
    officer: Officer,
    site?: Site,
    availability?: Availability[],
    minRestHours: number = 8,
    maxWeeklyHours: number = 40
): ConflictResult[] {
    const conflicts: ConflictResult[] = [];
    const newStart = parseDateTime(newShift.start_time);
    const newEnd = parseDateTime(newShift.end_time);

    // Filter to officer's shifts
    const officerShifts = existingShifts.filter(
        s => s.officer_id === officer.id && s.id !== newShift.id
    );

    // 1. Check for overlapping shifts
    for (const shift of officerShifts) {
        const existingStart = parseDateTime(shift.start_time);
        const existingEnd = parseDateTime(shift.end_time);

        if (doTimeRangesOverlap(newStart, newEnd, existingStart, existingEnd)) {
            conflicts.push({
                hasConflict: true,
                type: 'overlap',
                severity: 'error',
                message: `Officer is already scheduled for a shift from ${existingStart.toLocaleTimeString()} to ${existingEnd.toLocaleTimeString()}`,
                conflictingShift: shift
            });
        }
    }

    // 2. Check rest period between shifts
    for (const shift of officerShifts) {
        const existingStart = parseDateTime(shift.start_time);
        const existingEnd = parseDateTime(shift.end_time);

        // Check if new shift starts too soon after existing shift ends
        const restAfterExisting = getHoursBetween(existingEnd, newStart);
        if (restAfterExisting > 0 && restAfterExisting < minRestHours) {
            conflicts.push({
                hasConflict: true,
                type: 'rest_period',
                severity: 'warning',
                message: `Only ${restAfterExisting.toFixed(1)} hours of rest between shifts (minimum ${minRestHours}hrs required)`,
                conflictingShift: shift
            });
        }

        // Check if existing shift starts too soon after new shift ends
        const restBeforeExisting = getHoursBetween(newEnd, existingStart);
        if (restBeforeExisting > 0 && restBeforeExisting < minRestHours) {
            conflicts.push({
                hasConflict: true,
                type: 'rest_period',
                severity: 'warning',
                message: `Only ${restBeforeExisting.toFixed(1)} hours of rest before next shift (minimum ${minRestHours}hrs required)`,
                conflictingShift: shift
            });
        }
    }

    // 3. Check certification requirements (if site provided)
    if (site) {
        // This is a placeholder - you'd check site.required_certifications against officer.certifications
        const officerSkills = officer.skills || [];
        // Future: Check if officer has required certifications for the site
    }

    // 4. Check availability
    if (availability && availability.length > 0) {
        const shiftDate = newStart.toISOString().split('T')[0];
        const dayAvailability = availability.find(a => a.date === shiftDate);

        if (dayAvailability && !dayAvailability.available) {
            conflicts.push({
                hasConflict: true,
                type: 'availability',
                severity: 'warning',
                message: `Officer marked as unavailable on ${shiftDate}${dayAvailability.notes ? ': ' + dayAvailability.notes : ''}`
            });
        }

        // Check time window if partial availability
        if (dayAvailability?.available && dayAvailability.start_time && dayAvailability.end_time) {
            const availStart = dayAvailability.start_time;
            const availEnd = dayAvailability.end_time;
            const shiftStartTime = newStart.toTimeString().slice(0, 5);
            const shiftEndTime = newEnd.toTimeString().slice(0, 5);

            if (shiftStartTime < availStart || shiftEndTime > availEnd) {
                conflicts.push({
                    hasConflict: true,
                    type: 'availability',
                    severity: 'warning',
                    message: `Shift time (${shiftStartTime}-${shiftEndTime}) falls outside officer's available hours (${availStart}-${availEnd})`
                });
            }
        }
    }

    // 5. Check weekly overtime projection
    const weekStart = new Date(newStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyShifts = officerShifts.filter(s => {
        const start = parseDateTime(s.start_time);
        return start >= weekStart && start < weekEnd;
    });

    const existingHours = weeklyShifts.reduce((sum, s) => {
        return sum + getHoursBetween(parseDateTime(s.start_time), parseDateTime(s.end_time));
    }, 0);

    const newShiftHours = getHoursBetween(newStart, newEnd);
    const projectedTotal = existingHours + newShiftHours;

    if (projectedTotal > maxWeeklyHours) {
        conflicts.push({
            hasConflict: true,
            type: 'overtime',
            severity: 'warning',
            message: `This shift will result in ${projectedTotal.toFixed(1)} weekly hours (${(projectedTotal - maxWeeklyHours).toFixed(1)}hrs overtime)`
        });
    }

    return conflicts;
}

/**
 * Check if officer has required rest period before a shift
 */
export function checkRestPeriod(
    shifts: Shift[],
    minRestHours: number = 8
): { valid: boolean; message?: string } {
    const sorted = [...shifts].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
        const currentEnd = parseDateTime(sorted[i].end_time);
        const nextStart = parseDateTime(sorted[i + 1].start_time);
        const restHours = getHoursBetween(currentEnd, nextStart);

        if (restHours < minRestHours) {
            return {
                valid: false,
                message: `Insufficient rest (${restHours.toFixed(1)}hrs) between shifts ending ${currentEnd.toLocaleTimeString()} and starting ${nextStart.toLocaleTimeString()}`
            };
        }
    }

    return { valid: true };
}

/**
 * Calculate projected weekly hours for an officer
 */
export function calculateWeeklyHours(
    shifts: Shift[],
    weekStartDate?: Date
): { regular: number; overtime: number; total: number } {
    const weekStart = weekStartDate || new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekShifts = shifts.filter(s => {
        const start = parseDateTime(s.start_time);
        return start >= weekStart && start < weekEnd;
    });

    const total = weekShifts.reduce((sum, s) => {
        return sum + getHoursBetween(parseDateTime(s.start_time), parseDateTime(s.end_time));
    }, 0);

    return {
        regular: Math.min(total, 40),
        overtime: Math.max(0, total - 40),
        total
    };
}

/**
 * Get conflict severity badge color
 */
export function getConflictColor(severity: 'warning' | 'error'): string {
    return severity === 'error' ? 'text-red-500' : 'text-yellow-500';
}

/**
 * Get conflict icon based on type
 */
export function getConflictIcon(type: ConflictResult['type']): string {
    const icons = {
        overlap: '⚠️',
        rest_period: '😴',
        certification: '📜',
        availability: '📅',
        overtime: '⏰'
    };
    return icons[type] || '⚠️';
}

export const scheduleValidation = {
    detectConflicts,
    checkRestPeriod,
    calculateWeeklyHours,
    getConflictColor,
    getConflictIcon
};
