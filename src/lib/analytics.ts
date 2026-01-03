/**
 * Analytics Tracking Utility
 * Story 9.7.5: ShareDeal Integration
 * 
 * Provides centralized analytics tracking for user events
 * Currently logs to console in development
 * TODO: Integrate with analytics service (PostHog, Mixpanel, GA4)
 */

import { supabase } from './supabase';

/**
 * Track an analytics event
 * @param eventName - Name of the event (e.g., 'deal_shared', 'user_signup')
 * @param properties - Additional event properties
 */
export function trackEvent(
    eventName: string,
    properties?: Record<string, any>
) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics]', eventName, properties);
    }

    // Send to analytics service (if configured)
    if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track(eventName, properties);
    }

    // Log to database for internal analytics
    logEventToDatabase(eventName, properties).catch((error) => {
        console.error('Failed to log event to database:', error);
    });
}

/**
 * Log event to database for internal analytics
 * Note: Requires analytics_events table (create if needed)
 */
async function logEventToDatabase(
    eventName: string,
    properties?: Record<string, any>
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // For now, just log to console
        // TODO: Create analytics_events table and uncomment below
        /*
        await supabase.from('analytics_events').insert({
          event_name: eventName,
          properties,
          user_id: user?.id,
          created_at: new Date().toISOString(),
        });
        */

        if (process.env.NODE_ENV === 'development') {
            console.log('[DB Analytics]', {
                event_name: eventName,
                properties,
                user_id: user?.id,
            });
        }
    } catch (error) {
        // Silently fail - analytics should not break user experience
        console.error('Analytics DB error:', error);
    }
}

/**
 * Track page view
 * @param pageName - Name of the page
 * @param properties - Additional properties
 */
export function trackPageView(
    pageName: string,
    properties?: Record<string, any>
) {
    trackEvent('page_viewed', {
        page_name: pageName,
        ...properties,
    });
}

/**
 * Track user action
 * @param action - Action name
 * @param properties - Additional properties
 */
export function trackAction(
    action: string,
    properties?: Record<string, any>
) {
    trackEvent('user_action', {
        action,
        ...properties,
    });
}
