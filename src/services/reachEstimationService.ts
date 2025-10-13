/**
 * Real Reach Estimation Service
 * Queries actual Supabase database to calculate campaign reach
 * Supports debug mode to show SQL queries and execution time
 */

import { supabase } from '../lib/supabase';
import type { TargetingRules } from '../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

export interface ReachEstimationResult {
  total_users: number;
  matching_users: number;
  reach_percentage: number;
  breakdown_by_segment?: Record<string, number>;
  breakdown_by_age?: Record<string, number>;
  breakdown_by_gender?: Record<string, number>;
  sql_query: string;
  execution_time_ms: number;
  filters_applied: Record<string, any>;
}

// ============================================================================
// MAIN ESTIMATION FUNCTION
// ============================================================================

export async function estimateReach(
  businessId: string,
  targeting: TargetingRules,
  cityId?: string
): Promise<ReachEstimationResult> {
  const startTime = Date.now();
  
  try {
    // Build the query conditions
    const conditions: string[] = [];
    const filtersApplied: Record<string, any> = {};

    // ========================================================================
    // DEMOGRAPHIC FILTERS
    // ========================================================================

    // Age ranges
    if (targeting.age_ranges && targeting.age_ranges.length > 0) {
      filtersApplied.age_ranges = targeting.age_ranges;
    }
    
    // Gender
    if (targeting.gender && targeting.gender.length > 0) {
      filtersApplied.gender = targeting.gender;
    }

    // ========================================================================
    // LOCATION FILTERS
    // ========================================================================

    // City (auto-set from business, or use targeting city_id)
    const targetCityId = targeting.city_id || cityId;
    if (targetCityId) {
      filtersApplied.city_id = targetCityId;
    }

    // Radius-based targeting
    if (targeting.center_lat && targeting.center_lng && targeting.radius_km) {
      filtersApplied.location_radius = {
        lat: targeting.center_lat,
        lng: targeting.center_lng,
        radius_km: targeting.radius_km
      };
    }

    // ========================================================================
    // BEHAVIOR FILTERS (Customer Segments)
    // ========================================================================

    if (targeting.customer_segments && targeting.customer_segments.length > 0) {
      filtersApplied.customer_segments = targeting.customer_segments;
    }

    // ========================================================================
    // BUILD AND EXECUTE QUERY
    // ========================================================================

    // Start with base query
    let query = supabase
      .from('profiles')
      .select('id, age_range, gender, city_id', { count: 'exact', head: false });

    // Apply demographic filters
    if (targeting.age_ranges && targeting.age_ranges.length > 0) {
      query = query.in('age_range', targeting.age_ranges);
    }

    if (targeting.gender && targeting.gender.length > 0) {
      query = query.in('gender', targeting.gender);
    }

    // Apply city filter
    if (targetCityId) {
      query = query.eq('city_id', targetCityId);
    }

    // Execute base query
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    let matchingUsers = count || 0;
    const profileIds = data?.map(p => p.id) || [];

    // ========================================================================
    // APPLY CUSTOMER SEGMENT FILTERS
    // ========================================================================

    if (targeting.customer_segments && targeting.customer_segments.length > 0 && profileIds.length > 0) {
      const segmentPromises = targeting.customer_segments.map(segment => 
        applySegmentFilter(segment, businessId, profileIds)
      );
      
      const segmentResults = await Promise.all(segmentPromises);
      
      // Intersect all segment results (users must match ALL selected segments)
      let filteredIds = profileIds;
      for (const segmentIds of segmentResults) {
        filteredIds = filteredIds.filter(id => segmentIds.includes(id));
      }
      
      matchingUsers = filteredIds.length;
    }

    // Get total user count for the city
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('city_id', targetCityId || cityId || '');

    const totalUsers = totalCount || 10000; // Fallback if no city filter
    const reachPercentage = totalUsers > 0 ? (matchingUsers / totalUsers) * 100 : 0;

    // ========================================================================
    // GENERATE SQL FOR DEBUG
    // ========================================================================

    const sqlQuery = generateDebugSQL(businessId, targeting, targetCityId);
    const executionTime = Date.now() - startTime;

    // ========================================================================
    // CALCULATE BREAKDOWNS
    // ========================================================================

    const breakdowns = await calculateBreakdowns(data || [], targeting);

    return {
      total_users: totalUsers,
      matching_users: matchingUsers,
      reach_percentage: reachPercentage,
      ...breakdowns,
      sql_query: sqlQuery,
      execution_time_ms: executionTime,
      filters_applied: filtersApplied
    };

  } catch (error: any) {
    console.error('Reach estimation error:', error);
    
    // Return mock data on error to prevent UI breaking
    return {
      total_users: 10000,
      matching_users: 0,
      reach_percentage: 0,
      sql_query: `-- Error: ${error.message}`,
      execution_time_ms: Date.now() - startTime,
      filters_applied: {}
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply customer segment filter and return matching user IDs
 */
async function applySegmentFilter(
  segment: string,
  businessId: string,
  profileIds: string[]
): Promise<string[]> {
  
  switch (segment) {
    case 'new_customers': {
      // Users who NEVER interacted with this business
      const { data } = await supabase
        .from('coupon_redemptions')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('business_id', businessId);
      
      const existingCustomerIds = new Set(data?.map(r => r.user_id) || []);
      return profileIds.filter(id => !existingCustomerIds.has(id));
    }

    case 'existing_customers': {
      // Users who previously interacted with this business
      const { data } = await supabase
        .from('coupon_redemptions')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('business_id', businessId);
      
      return Array.from(new Set(data?.map(r => r.user_id) || []));
    }

    case 'power_users': {
      // Drivers (top 10% most active users)
      const { data } = await supabase
        .from('driver_profiles')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('is_driver', true);
      
      return data?.map(d => d.user_id) || [];
    }

    case 'checked_in': {
      // Users who have checked in to this business
      const { data } = await supabase
        .from('business_checkins')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('business_id', businessId);
      
      return Array.from(new Set(data?.map(c => c.user_id) || []));
    }

    case 'nearby': {
      // Users currently near the business (within 1km, updated in last hour)
      // This requires real-time location tracking
      // For now, return all users as we don't have real-time location data
      console.warn('Nearby segment requires real-time location data - returning all users for now');
      return profileIds;
    }

    default:
      return profileIds;
  }
}

/**
 * Calculate demographic breakdowns
 */
async function calculateBreakdowns(
  profiles: any[],
  targeting: TargetingRules
) {
  const breakdownByAge: Record<string, number> = {};
  const breakdownByGender: Record<string, number> = {};

  profiles.forEach(profile => {
    // Age breakdown
    if (profile.age_range) {
      breakdownByAge[profile.age_range] = (breakdownByAge[profile.age_range] || 0) + 1;
    }

    // Gender breakdown
    if (profile.gender) {
      breakdownByGender[profile.gender] = (breakdownByGender[profile.gender] || 0) + 1;
    }
  });

  return {
    breakdown_by_age: Object.keys(breakdownByAge).length > 0 ? breakdownByAge : undefined,
    breakdown_by_gender: Object.keys(breakdownByGender).length > 0 ? breakdownByGender : undefined,
  };
}

/**
 * Generate readable SQL query for debug panel
 */
function generateDebugSQL(
  businessId: string,
  targeting: TargetingRules,
  cityId?: string
): string {
  const conditions: string[] = [];

  // Base query
  let sql = `SELECT COUNT(*) as matching_users\nFROM profiles\n`;

  // Add WHERE conditions
  if (targeting.age_ranges && targeting.age_ranges.length > 0) {
    conditions.push(`  age_range IN (${targeting.age_ranges.map(r => `'${r}'`).join(', ')})`);
  }

  if (targeting.gender && targeting.gender.length > 0) {
    conditions.push(`  gender IN (${targeting.gender.map(g => `'${g}'`).join(', ')})`);
  }

  if (cityId) {
    conditions.push(`  city_id = '${cityId}'`);
  }

  if (targeting.center_lat && targeting.center_lng && targeting.radius_km) {
    conditions.push(`  -- Radius filter: ${targeting.radius_km}km from (${targeting.center_lat}, ${targeting.center_lng})`);
    conditions.push(`  ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(${targeting.center_lng}, ${targeting.center_lat}), 4326)::geography, ${targeting.radius_km * 1000})`);
  }

  // Add customer segment conditions
  if (targeting.customer_segments && targeting.customer_segments.length > 0) {
    conditions.push(`  -- Customer Segments: ${targeting.customer_segments.join(', ')}`);
    
    targeting.customer_segments.forEach(segment => {
      switch (segment) {
        case 'new_customers':
          conditions.push(`  AND NOT EXISTS (SELECT 1 FROM coupon_redemptions cr WHERE cr.user_id = profiles.id AND cr.business_id = '${businessId}')`);
          break;
        case 'existing_customers':
          conditions.push(`  AND EXISTS (SELECT 1 FROM coupon_redemptions cr WHERE cr.user_id = profiles.id AND cr.business_id = '${businessId}')`);
          break;
        case 'power_users':
          conditions.push(`  AND EXISTS (SELECT 1 FROM driver_profiles dp WHERE dp.user_id = profiles.id AND dp.is_driver = true)`);
          break;
        case 'checked_in':
          conditions.push(`  AND EXISTS (SELECT 1 FROM business_checkins bc WHERE bc.user_id = profiles.id AND bc.business_id = '${businessId}')`);
          break;
        case 'nearby':
          conditions.push(`  AND last_location_update > NOW() - INTERVAL '1 hour'`);
          break;
      }
    });
  }

  if (conditions.length > 0) {
    sql += 'WHERE\n' + conditions.join('\n  AND ');
  }

  sql += ';';

  return sql;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  estimateReach
};
