import { supabase } from '@/lib/supabase';

export interface ApiUsageStats {
    totalRequests: number;
    autocompleteRequests: number;
    detailsRequests: number;
    uniqueUsers: number;
    estimatedCost: number;
    percentageUsed: number;
    monthlyLimit: number;
    isAvailable: boolean;
}

/**
 * Log an API call to the usage tracking table
 */
export async function logApiUsage(
    api: string,
    endpoint: string,
    options?: {
        businessId?: string;
        sessionId?: string;
        status?: 'success' | 'error' | 'rate_limited';
    }
): Promise<void> {
    try {
        await supabase.rpc('log_api_usage', {
            p_api: api,
            p_endpoint: endpoint,
            p_business_id: options?.businessId || null,
            p_session_id: options?.sessionId || null,
            p_response_status: options?.status || 'success'
        });
    } catch (error) {
        // Don't throw - logging failures shouldn't break the app
        console.error('Failed to log API usage:', error);
    }
}

/**
 * Check if an API is available (not over quota)
 */
export async function isApiAvailable(api: string): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('is_api_available', {
            p_api: api
        });

        if (error) {
            console.error('Error checking API availability:', error);
            return true; // Fail open - don't block on check failures
        }

        return data ?? true;
    } catch (error) {
        console.error('Error checking API availability:', error);
        return true;
    }
}

/**
 * Get current month usage statistics
 */
export async function getApiUsageStats(api: string): Promise<ApiUsageStats | null> {
    try {
        const { data, error } = await supabase.rpc('get_current_month_api_usage', {
            p_api: api
        });

        if (error || !data || data.length === 0) {
            console.error('Error getting API usage stats:', error);
            return null;
        }

        const stats = data[0];

        return {
            totalRequests: stats.total_requests,
            autocompleteRequests: stats.autocomplete_requests,
            detailsRequests: stats.details_requests,
            uniqueUsers: stats.unique_users,
            estimatedCost: parseFloat(stats.estimated_cost) || 0,
            percentageUsed: parseFloat(stats.percentage_used) || 0,
            monthlyLimit: stats.monthly_limit,
            isAvailable: parseFloat(stats.percentage_used) < 95
        };
    } catch (error) {
        console.error('Error getting API usage stats:', error);
        return null;
    }
}
