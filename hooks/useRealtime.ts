/**
 * useRealtime Hook
 * React hook for subscribing to real-time events
 */

import { useEffect, useState, useCallback } from 'react';
import {
    subscribeToOfficerLocations,
    subscribeToPanicAlerts,
    subscribeToGeofenceEvents,
    subscribeToActivityFeed,
    onRealtimeEvent
} from '../lib/realtime';
import type {
    OfficerLocation,
    PanicAlert,
    GeofenceEvent,
    RealtimeEvent,
    RealtimeEventType
} from '../lib/types';

/**
 * Subscribe to all officer locations
 */
export function useOfficerLocations() {
    const [locations, setLocations] = useState<OfficerLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        try {
            const unsubscribe = subscribeToOfficerLocations((data) => {
                setLocations(data);
                setLoading(false);
            });
            return unsubscribe;
        } catch (err) {
            setError(err as Error);
            setLoading(false);
        }
    }, []);

    return { locations, loading, error };
}

/**
 * Subscribe to a specific officer's location
 */
export function useOfficerLocation(officerId: string | null) {
    const [location, setLocation] = useState<OfficerLocation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!officerId) {
            setLocation(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { subscribeToOfficerLocation } = require('../lib/realtime');
        const unsubscribe = subscribeToOfficerLocation(officerId, (data: OfficerLocation | null) => {
            setLocation(data);
            setLoading(false);
        });

        return unsubscribe;
    }, [officerId]);

    return { location, loading };
}

/**
 * Subscribe to active panic alerts
 */
export function usePanicAlerts() {
    const [alerts, setAlerts] = useState<PanicAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToPanicAlerts((data) => {
            setAlerts(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const hasActiveAlert = alerts.some(a => a.status === 'active');

    return { alerts, loading, hasActiveAlert };
}

/**
 * Subscribe to geofence breach events
 */
export function useGeofenceEvents() {
    const [events, setEvents] = useState<GeofenceEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToGeofenceEvents((data) => {
            setEvents(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const unacknowledgedCount = events.filter(e => !e.acknowledged).length;

    return { events, loading, unacknowledgedCount };
}

/**
 * Subscribe to activity feed
 */
export function useActivityFeed(limit: number = 20) {
    const [events, setEvents] = useState<RealtimeEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToActivityFeed((data) => {
            setEvents(data);
            setLoading(false);
        }, limit);
        return unsubscribe;
    }, [limit]);

    return { events, loading };
}

/**
 * Subscribe to specific event types
 */
export function useRealtimeEvent(
    eventType: RealtimeEventType | '*',
    callback: (event: RealtimeEvent) => void
) {
    useEffect(() => {
        const unsubscribe = onRealtimeEvent(eventType, callback);
        return unsubscribe;
    }, [eventType, callback]);
}

/**
 * Combined hook for command center - all critical alerts
 */
export function useCommandCenter() {
    const { alerts: panicAlerts, hasActiveAlert } = usePanicAlerts();
    const { events: geofenceEvents, unacknowledgedCount } = useGeofenceEvents();
    const { locations } = useOfficerLocations();
    const { events: activityFeed } = useActivityFeed(30);

    const criticalAlertCount =
        panicAlerts.filter(a => a.status === 'active').length +
        geofenceEvents.filter(e => !e.acknowledged && e.event_type === 'exit').length;

    return {
        panicAlerts,
        geofenceEvents,
        locations,
        activityFeed,
        hasActiveAlert,
        unacknowledgedGeofence: unacknowledgedCount,
        criticalAlertCount
    };
}
