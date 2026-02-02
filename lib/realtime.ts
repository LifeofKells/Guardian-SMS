/**
 * Realtime Service
 * Handles real-time subscriptions using Firestore onSnapshot
 */

import { firestore } from './firebase';
import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    updateDoc,
    Timestamp,
    type Unsubscribe
} from 'firebase/firestore';
import type {
    OfficerLocation,
    PanicAlert,
    GeofenceEvent,
    RealtimeEvent,
    RealtimeEventType
} from './types';

// --- EVENT EMITTER ---

type EventCallback = (event: RealtimeEvent) => void;

class RealtimeEventEmitter {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    subscribe(eventType: RealtimeEventType | '*', callback: EventCallback): () => void {
        const key = eventType;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(key)?.delete(callback);
        };
    }

    emit(event: RealtimeEvent) {
        // Notify specific listeners
        this.listeners.get(event.type)?.forEach(cb => cb(event));
        // Notify wildcard listeners
        this.listeners.get('*')?.forEach(cb => cb(event));
    }
}

// --- SINGLETON INSTANCE ---

const eventEmitter = new RealtimeEventEmitter();
let activeSubscriptions: Unsubscribe[] = [];

// --- OFFICER LOCATIONS ---

export function subscribeToOfficerLocations(
    onUpdate: (locations: OfficerLocation[]) => void
): Unsubscribe {
    const q = query(
        collection(firestore, 'officer_locations'),
        orderBy('timestamp', 'desc'),
        limit(100)
    );

    return onSnapshot(q, (snapshot) => {
        const locations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as OfficerLocation[];
        onUpdate(locations);
    });
}

export function subscribeToOfficerLocation(
    officerId: string,
    onUpdate: (location: OfficerLocation | null) => void
): Unsubscribe {
    const q = query(
        collection(firestore, 'officer_locations'),
        where('officer_id', '==', officerId),
        orderBy('timestamp', 'desc'),
        limit(1)
    );

    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            onUpdate(null);
        } else {
            const doc = snapshot.docs[0];
            onUpdate({ id: doc.id, ...doc.data() } as OfficerLocation);
        }
    });
}

// --- PANIC ALERTS ---

export function subscribeToPanicAlerts(
    onUpdate: (alerts: PanicAlert[]) => void
): Unsubscribe {
    const q = query(
        collection(firestore, 'panic_alerts'),
        where('status', '==', 'active'),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as PanicAlert[];
        onUpdate(alerts);

        // Emit events for new alerts
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                eventEmitter.emit({
                    id: change.doc.id,
                    type: 'panic_alert',
                    payload: change.doc.data(),
                    timestamp: new Date().toISOString(),
                    officer_id: change.doc.data().officer_id
                });
            }
        });
    });
}

export async function createPanicAlert(
    officerId: string,
    location: { lat: number; lng: number }
): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'panic_alerts'), {
        officer_id: officerId,
        location,
        timestamp: new Date().toISOString(),
        status: 'active'
    });
    return docRef.id;
}

export async function acknowledgePanicAlert(
    alertId: string,
    userId: string
): Promise<void> {
    await updateDoc(doc(firestore, 'panic_alerts', alertId), {
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
    });
}

export async function resolvePanicAlert(
    alertId: string,
    notes?: string
): Promise<void> {
    await updateDoc(doc(firestore, 'panic_alerts', alertId), {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        notes
    });
}

// --- GEOFENCE EVENTS ---

export function subscribeToGeofenceEvents(
    onUpdate: (events: GeofenceEvent[]) => void
): Unsubscribe {
    const q = query(
        collection(firestore, 'geofence_events'),
        where('acknowledged', '==', false),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as GeofenceEvent[];
        onUpdate(events);

        // Emit events for breaches
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added' && change.doc.data().event_type === 'exit') {
                eventEmitter.emit({
                    id: change.doc.id,
                    type: 'geofence_breach',
                    payload: change.doc.data(),
                    timestamp: new Date().toISOString(),
                    officer_id: change.doc.data().officer_id,
                    site_id: change.doc.data().site_id
                });
            }
        });
    });
}

export async function acknowledgeGeofenceEvent(eventId: string): Promise<void> {
    await updateDoc(doc(firestore, 'geofence_events', eventId), {
        acknowledged: true
    });
}

// --- ACTIVITY FEED ---

export function subscribeToActivityFeed(
    onUpdate: (events: RealtimeEvent[]) => void,
    eventLimit: number = 20
): Unsubscribe {
    const q = query(
        collection(firestore, 'activity_feed'),
        orderBy('timestamp', 'desc'),
        limit(eventLimit)
    );

    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as RealtimeEvent[];
        onUpdate(events);
    });
}

export async function logActivity(event: Omit<RealtimeEvent, 'id'>): Promise<void> {
    await addDoc(collection(firestore, 'activity_feed'), event);
}

// --- EVENT SUBSCRIPTION ---

export function onRealtimeEvent(
    eventType: RealtimeEventType | '*',
    callback: EventCallback
): () => void {
    return eventEmitter.subscribe(eventType, callback);
}

// --- LOCATION UPDATES (for officer mobile) ---

export async function updateOfficerLocation(
    officerId: string,
    location: Omit<OfficerLocation, 'id' | 'officer_id'>
): Promise<void> {
    // Use officer_id as document ID for easy lookup
    await updateDoc(doc(firestore, 'officer_locations', officerId), {
        officer_id: officerId,
        ...location,
        timestamp: new Date().toISOString()
    }).catch(async () => {
        // Document doesn't exist, create it
        await addDoc(collection(firestore, 'officer_locations'), {
            officer_id: officerId,
            ...location,
            timestamp: new Date().toISOString()
        });
    });
}

// --- CLEANUP ---

export function cleanupSubscriptions(): void {
    activeSubscriptions.forEach(unsub => unsub());
    activeSubscriptions = [];
}

// --- EXPORTS ---

export const realtime = {
    // Locations
    subscribeToOfficerLocations,
    subscribeToOfficerLocation,
    updateOfficerLocation,
    // Panic Alerts  
    subscribeToPanicAlerts,
    createPanicAlert,
    acknowledgePanicAlert,
    resolvePanicAlert,
    // Geofence
    subscribeToGeofenceEvents,
    acknowledgeGeofenceEvent,
    // Activity
    subscribeToActivityFeed,
    logActivity,
    // Events
    onRealtimeEvent,
    // Cleanup
    cleanupSubscriptions
};
