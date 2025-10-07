// src/utils/businessMapper.ts
import type { Business } from '../types/business';

/**
 * Normalize business object to include both new DB schema fields and legacy fields
 * for backward compatibility during migration period.
 */
export function normalizeBusiness(business: any): Business {
  return {
    ...business,
    // Map new fields to legacy fields for backward compatibility
    name: business.business_name || business.name,
    business_name: business.business_name || business.name,
    
    category: business.business_type || business.category,
    business_type: business.business_type || business.category,
    
    owner_id: business.user_id || business.owner_id,
    user_id: business.user_id || business.owner_id,
    
    phone: business.business_phone || business.phone,
    business_phone: business.business_phone || business.phone,
    
    email: business.business_email || business.email,
    business_email: business.business_email || business.email,
    
    website: business.website_url || business.website,
    website_url: business.website_url || business.website,
    
    pincode: business.postal_code || business.pincode,
    postal_code: business.postal_code || business.pincode,
    
    rating: business.average_rating || business.rating,
    average_rating: business.average_rating || business.rating,
    
    review_count: business.total_reviews || business.review_count,
    total_reviews: business.total_reviews || business.review_count,
    
    is_verified: business.verified ?? business.is_verified,
    verified: business.verified ?? business.is_verified,
    
    // Handle status vs is_active mapping
    is_active: business.status === 'active' || business.is_active,
    status: business.status || (business.is_active ? 'active' : 'inactive'),
  };
}

/**
 * Normalize an array of business objects
 */
export function normalizeBusinesses(businesses: any[]): Business[] {
  return businesses.map(normalizeBusiness);
}
