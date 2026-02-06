
import { useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

/**
 * useAutoShiftCompletion Hook
 * Automatically marks expired shifts as completed when an administrator or manager is online.
 * This ensures that timesheets stay up to date and reports are accurate.
 */
export function useAutoShiftCompletion() {
    const { organization, profile } = useAuth();
    const lastRunRef = useRef<number>(0);
    const isAdmin = profile?.role === 'ops_manager' || profile?.role === 'admin' || profile?.role === 'owner';

    useEffect(() => {
        // Only run for administrators/managers every 5 minutes
        if (!organization || !isAdmin) return;

        const runCleanup = async () => {
            const now = Date.now();
            // throttle to prevent multiple parallel runs if component re-renders
            if (now - lastRunRef.current < 1000 * 60 * 5) return;

            lastRunRef.current = now;

            console.log("Checking for expired shifts to auto-complete...");
            const { count, error } = await db.shifts.autoCompleteExpiredShifts(organization.id);

            if (error) {
                console.error("Auto-completion error:", error);
            } else if (count > 0) {
                console.log(`Auto-completed ${count} shifts.`);
            }
        };

        // Run on mount
        runCleanup();

        // Run periodically
        const interval = setInterval(runCleanup, 1000 * 60 * 10); // Every 10 minutes

        return () => clearInterval(interval);
    }, [organization, isAdmin]);
}
