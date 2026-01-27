// src/types/business.ts
export interface Business {
  id: string;
  business_name: string; // Changed from 'name' to match DB schema
  name?: string; // Keep for backward compatibility
  description?: string;
  business_type: string; // Changed from 'category' to match DB schema
  category?: string; // Keep for backward compatibility
  user_id: string; // Changed from 'owner_id' to match DB schema
  owner_id?: string; // Keep for backward compatibility
  logo_url?: string;
  cover_image_url?: string;
  business_phone?: string; // Changed from 'phone' to match DB schema
  phone?: string; // Keep for backward compatibility
  business_email?: string; // Changed from 'email' to match DB schema
  email?: string; // Keep for backward compatibility
  website_url?: string; // Changed from 'website' to match DB schema
  website?: string; // Keep for backward compatibility
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string; // Changed from 'pincode' to match DB schema
  pincode?: string; // Keep for backward compatibility
  latitude?: number;
  longitude?: number;
  average_rating?: number; // Changed from 'rating' to match DB schema
  rating?: number; // Keep for backward compatibility
  total_reviews?: number; // Changed from 'review_count' to match DB schema
  review_count?: number; // Keep for backward compatibility
  follower_count?: number;
  verified?: boolean; // Changed from 'is_verified' to match DB schema
  is_verified?: boolean; // Keep for backward compatibility
  status: 'pending' | 'active' | 'suspended' | 'inactive'; // Changed from 'is_active' to match DB schema
  is_active?: boolean; // Keep for backward compatibility
  created_at: string;
  updated_at?: string;
  claim_status?: string; // e.g. 'unclaimed', 'claimed_pending', 'claimed_verified'
  phone_verified?: boolean;

  // Recommendation Badge
  recommendation_badge?: 'recommended' | 'highly_recommended' | 'very_highly_recommended' | null;
  recommendation_percentage?: number;
  approved_review_count?: number;

  // Joined data
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface BusinessCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface NewBusinessesProps {
  limit?: number;
  daysThreshold?: number;
  showLoadMore?: boolean;
}
