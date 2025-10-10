// src/types/ads.ts
export interface Ad {
  id: string;
  business_id: string;
  business_name: string;
  type: 'banner' | 'carousel' | 'search' | 'trending';
  title: string;
  description?: string;
  image_url?: string;
  cta_text?: string;
  cta_url?: string;
  priority: number;
  start_date: string;
  end_date: string;
  daily_budget: number; // ₹500/day for banner
  impressions: number;
  clicks: number;
  status?: 'pending' | 'active' | 'paused' | 'ended';
  created_at: string;
}

export interface OrganicContent {
  id: string;
  type: 'business' | 'offer' | 'product';
  title: string;
  description?: string;
  image_url?: string;
  cta_text: string;
  cta_url: string;
  priority: number;
}

export interface AdSlotData {
  position: number; // 1-6
  content_type: 'paid_ad' | 'organic';
  ad?: Ad;
  organic?: OrganicContent;
}
