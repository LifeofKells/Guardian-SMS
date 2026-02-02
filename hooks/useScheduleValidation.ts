/**
 * useScheduleValidation Hook
 * React hook for schedule conflict detection
 */

import { useMemo, useCallback } from 'react';
import { detectConflicts, calculateWeeklyHours, type ConflictResult } from '../lib/scheduleValidation';
import type { Shift, Officer, Site, Availability } from '../lib/types';

interface UseScheduleValidationProps {
    shifts: Shift[];
    officers: Officer[];
    sites?: Site[];
    availability?: Availability[];
}

export function useScheduleValidation({
    shifts,
    officers,
    sites = [],
    availability = []
}: UseScheduleValidationProps) {

    /**
     * Validate a proposed shift assignment
     */
    const validateAssignment = useCallback((
        shift: Shift,
        officerId: string
    ): ConflictResult[] => {
        const officer = officers.find(o => o.id === officerId);
        if (!officer) return [];

        const site = sites.find(s => s.id === shift.site_id);
        const officerAvailability = availability.filter(a => a.officer_id === officerId);

        const proposedShift = { ...shift, officer_id: officerId };

        return detectConflicts(
            proposedShift,
            shifts,
            officer,
            site,
            officerAvailability
        );
    }, [shifts, officers, sites, availability]);

    /**
     * Check if assignment has any blocking conflicts (errors)
     */
    const hasBlockingConflicts = useCallback((
        shift: Shift,
        officerId: string
    ): boolean => {
        const conflicts = validateAssignment(shift, officerId);
        return conflicts.some(c => c.severity === 'error');
    }, [validateAssignment]);

    /**
     * Get weekly hours for each officer
     */
    const weeklyHoursByOfficer = useMemo(() => {
        const result: Record<string, { regular: number; overtime: number; total: number }> = {};

        officers.forEach(officer => {
            const officerShifts = shifts.filter(s => s.officer_id === officer.id);
            result[officer.id] = calculateWeeklyHours(officerShifts);
        });

        return result;
    }, [shifts, officers]);

    /**
     * Get officers approaching overtime threshold
     */
    const overtimeWarnings = useMemo(() => {
        type HoursEntry = [string, { regular: number; overtime: number; total: number }];
        const entries = Object.entries(weeklyHoursByOfficer) as HoursEntry[];
        return entries
            .filter((entry) => entry[1].total >= 36) // Warning at 36+ hours
            .map((entry) => ({
                officerId: entry[0],
                officer: officers.find(o => o.id === entry[0]),
                ...entry[1]
            }));
    }, [weeklyHoursByOfficer, officers]);

    /**
     * Find available officers for a shift (no blocking conflicts)
     */
    const findAvailableOfficers = useCallback((shift: Shift): Officer[] => {
        return officers.filter(officer => {
            const conflicts = validateAssignment(shift, officer.id);
            return !conflicts.some(c => c.severity === 'error');
        });
    }, [officers, validateAssignment]);

    /**
     * Get recommended officers (available + sorted by weekly hours)
     */
    const getRecommendedOfficers = useCallback((shift: Shift): Officer[] => {
        const available = findAvailableOfficers(shift);

        // Sort by weekly hours (prefer officers with fewer hours to balance workload)
        return [...available].sort((a, b) => {
            const aHours = weeklyHoursByOfficer[a.id]?.total || 0;
            const bHours = weeklyHoursByOfficer[b.id]?.total || 0;
            return aHours - bHours;
        });
    }, [findAvailableOfficers, weeklyHoursByOfficer]);

    return {
        validateAssignment,
        hasBlockingConflicts,
        weeklyHoursByOfficer,
        overtimeWarnings,
        findAvailableOfficers,
        getRecommendedOfficers
    };
}
