// src/types/offers.ts
// TypeScript interfaces for Business Offers system (Story 4.12)

export type OfferStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived' | 'terminated';

export type ShareChannel = 'whatsapp' | 'facebook' | 'twitter' | 'in_app' | 'other';

export type LifecycleEventType =
  | 'created'
  | 'activated'
  | 'deactivated'
  | 'expired'
  | 'extended'
  | 'duplicated'
  | 'archived'
  | 'terminated'
  | 'deleted';

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  terms_conditions: string | null;
  valid_from: string | null; // ISO date string (nullable for drafts)
  valid_until: string | null; // ISO date string (nullable for drafts)
  created_at: string;

  // New fields from Story 4.12 & 4.14
  status: OfferStatus;
  offer_code: string;
  icon_image_url: string | null;
  view_count: number;
  share_count: number;
  click_count: number;
  created_by: string | null;
  updated_at: string | null;
  activated_at: string | null;
  expired_at: string | null;
  deleted_at: string | null;
  pause_reason: string | null;
  terminate_reason: string | null;

  // New fields from Story 4.14 - 4.19 Enhancements
  audit_code: string; // Unique tracking code
  custom_reference: string | null;
  is_featured: boolean;
  featured_priority: number;

  // Relations (optional, populated with joins)
  business?: {
    id: string;
    business_name: string;
    business_image: string | null;
  };

  // Story 4.12B
  offer_type_id?: string;
  offer_type?: OfferType;
}

export interface OfferDraft {
  id: string;
  user_id: string;
  business_id: string;
  draft_name: string;
  form_data: {
    title?: string;
    description?: string;
    terms_conditions?: string;
    icon_image_url?: string;
    valid_from?: string;
    valid_until?: string;
    offer_type_id?: string;
  };
  step_completed: number; // 1-4
  created_at: string;
  updated_at: string;
}

export interface OfferAnalytics {
  id: string;
  offer_id: string;
  business_id: string;

  // View metrics
  total_views: number;
  unique_viewers: number;

  // Share metrics
  total_shares: number;
  unique_sharers: number;
  share_channels: Record<ShareChannel, number>;

  // Click metrics
  total_clicks: number;
  unique_clickers: number;
  click_sources: Record<string, number>;

  // Daily stats for charts
  daily_stats: Array<{
    date: string;
    views: number;
    shares: number;
    clicks: number;
  }>;

  created_at: string;
  updated_at: string;
}

export interface OfferShare {
  id: string;
  offer_id: string;
  business_id: string;
  sharer_id: string | null;
  share_channel: ShareChannel;
  shared_to_user_id: string | null;
  shared_at: string;
  was_clicked: boolean;
  clicked_at: string | null;
}

export interface OfferLifecycleEvent {
  id: string;
  offer_id: string;
  business_id: string;
  user_id: string | null;
  event_type: LifecycleEventType;
  event_metadata: Record<string, any>;
  event_timestamp: string;
}

// Form data for creating/updating offers
export interface OfferFormData {
  title: string;
  description: string;
  terms_conditions: string;
  icon_image_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  offer_type_id?: string;
  audit_code?: string; // Read-only display
  is_featured?: boolean;
}

// API response types
export interface OfferListResponse {
  offers: Offer[];
  total: number;
  page: number;
  limit: number;
}

export interface OfferAnalyticsSummary {
  offer_id: string;
  views: number;
  shares: number;
  clicks: number;
  ctr: number; // Click-through rate
  share_rate: number;
}

// Filter/query types
export interface OfferFilters {
  status?: OfferStatus | OfferStatus[];
  business_id?: string;
  created_by?: string;
  valid_from?: string;
  valid_until?: string;
}

export interface OfferSortOptions {
  field: 'created_at' | 'valid_from' | 'valid_until' | 'view_count' | 'share_count' | 'title';
  direction: 'asc' | 'desc';
}

// Story 4.12B: Offer Categorization Types
export interface OfferCategory {
  id: string;
  name: string;
  icon_name: string; // Lucide icon name
  display_order: number;
}

export interface OfferType {
  id: string;
  category_id: string;
  offer_name: string;
  description: string | null;
  example: string | null;
  frequency: string | null; // "Very frequently", etc.
  display_order: number;
  // Optional join
  category?: OfferCategory;
}
