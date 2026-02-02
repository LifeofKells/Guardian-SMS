/**
 * Geofence Service
 * Calculate distances and detect geofence breaches
 */

import type { OfficerLocation, Site, GeofenceEvent } from './types';
import { addDoc, collection } from 'firebase/firestore';
import { firestore } from './firebase';

// Earth radius in meters
const EARTH_RADIUS = 6371000;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS * c;
}

/**
 * Check if a location is within a site's geofence
 */
export function isWithinGeofence(
    location: { lat: number; lng: number },
    site: Site
): boolean {
    const distance = calculateDistance(
        location.lat,
        location.lng,
        site.lat,
        site.lng
    );
    return distance <= site.radius;
}

/**
 * Check location against geofence and return event if breach detected
 */
export function checkGeofence(
    location: OfficerLocation,
    site: Site,
    wasInside: boolean
): GeofenceEvent | null {
    const distance = calculateDistance(
        location.lat,
        location.lng,
        site.lat,
        site.lng
    );

    const isInside = distance <= site.radius;

    // No state change
    if (isInside === wasInside) {
        return null;
    }

    return {
        id: '', // Will be set by Firestore
        officer_id: location.officer_id,
        site_id: site.id,
        event_type: isInside ? 'enter' : 'exit',
        location: { lat: location.lat, lng: location.lng },
        distance_from_center: Math.round(distance),
        timestamp: new Date().toISOString(),
        acknowledged: false
    };
}

/**
 * Record a geofence event to the database
 */
export async function recordGeofenceEvent(
    event: Omit<GeofenceEvent, 'id'>
): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'geofence_events'), event);
    return docRef.id;
}

/**
 * Get distance description for display
 */
export function getDistanceDescription(meters: number): string {
    if (meters < 100) {
        return `${Math.round(meters)}m`;
    } else if (meters < 1000) {
        return `${Math.round(meters / 10) * 10}m`;
    } else {
        return `${(meters / 1000).toFixed(1)}km`;
    }
}

/**
 * Check if officer is approaching geofence boundary (within 80% of radius)
 */
export function isApproachingBoundary(
    location: { lat: number; lng: number },
    site: Site
): boolean {
    const distance = calculateDistance(
        location.lat,
        location.lng,
        site.lat,
        site.lng
    );
    return distance > site.radius * 0.8 && distance <= site.radius;
}

export const geofence = {
    calculateDistance,
    isWithinGeofence,
    checkGeofence,
    recordGeofenceEvent,
    getDistanceDescription,
    isApproachingBoundary
};
