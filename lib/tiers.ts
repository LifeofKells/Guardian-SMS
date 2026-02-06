import { SubscriptionTier } from './types';

// Feature flags per subscription tier
export const TIER_FEATURES = {
    basic: [
        'coverage_calendar',
        'incident_summary',
        'activity_feed',
    ],
    professional: [
        'coverage_calendar',
        'incident_summary',
        'activity_feed',
        'patrol_paths',
        'checkpoint_timeline',
        'shift_ratings',
        'incident_photos',
    ],
    enterprise: [
        'coverage_calendar',
        'incident_summary',
        'activity_feed',
        'patrol_paths',
        'checkpoint_timeline',
        'shift_ratings',
        'incident_photos',
        'white_labeling',
        'custom_domain',
        'custom_css',
        'service_requests',
        'pdf_reports',
        'api_access',
    ],
} as const;

export type Feature =
    | 'coverage_calendar'
    | 'incident_summary'
    | 'activity_feed'
    | 'patrol_paths'
    | 'checkpoint_timeline'
    | 'shift_ratings'
    | 'incident_photos'
    | 'white_labeling'
    | 'custom_domain'
    | 'custom_css'
    | 'service_requests'
    | 'pdf_reports'
    | 'api_access';

/**
 * Check if a given subscription tier has access to a specific feature
 */
export function hasFeature(tier: SubscriptionTier, feature: Feature): boolean {
    return (TIER_FEATURES[tier] as readonly string[]).includes(feature);
}

/**
 * Get all features available for a given tier
 */
export function getTierFeatures(tier: SubscriptionTier): readonly Feature[] {
    return TIER_FEATURES[tier];
}

/**
 * Tier pricing information (monthly)
 */
export const TIER_PRICING = {
    basic: {
        name: 'Basic',
        price: 99,
        description: 'Essential client transparency features',
    },
    professional: {
        name: 'Professional',
        price: 249,
        description: 'Advanced reporting and client engagement',
    },
    enterprise: {
        name: 'Enterprise',
        price: 499,
        description: 'Full white-labeling and custom integrations',
    },
} as const;

/**
 * Get tier details including pricing
 */
export function getTierDetails(tier: SubscriptionTier) {
    return TIER_PRICING[tier];
}

/**
 * Check if tier can be upgraded to a higher tier
 */
export function canUpgradeTo(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
    const tierOrder: SubscriptionTier[] = ['basic', 'professional', 'enterprise'];
    return tierOrder.indexOf(targetTier) > tierOrder.indexOf(currentTier);
}
