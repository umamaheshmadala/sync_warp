/**
 * Mock Data
 * Test data for campaigns, drivers, and analytics
 */

import type {
  Campaign,
  CampaignAnalytics,
  DriverProfile,
  TargetingRules
} from '../../types/campaigns';

// Mock Campaigns
export const mockCampaign: Campaign = {
  id: 'campaign-123',
  name: 'Test Campaign',
  description: 'This is a test campaign',
  business_id: 'business-456',
  city_id: 'city-789',
  status: 'active',
  ad_format: 'banner',
  priority: 'medium',
  budget: 10000,
  target_impressions: 50000,
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-12-31T23:59:59Z',
  targeting_rules: {
    driver_score_min: 70,
    driver_score_max: 100
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const mockCampaigns: Campaign[] = [
  mockCampaign,
  {
    ...mockCampaign,
    id: 'campaign-456',
    name: 'Second Campaign',
    status: 'scheduled',
    ad_format: 'video'
  },
  {
    ...mockCampaign,
    id: 'campaign-789',
    name: 'Third Campaign',
    status: 'paused',
    ad_format: 'native'
  }
];

// Mock Campaign Analytics
export const mockAnalytics: CampaignAnalytics = {
  id: 'analytics-123',
  campaign_id: 'campaign-123',
  total_impressions: 25000,
  total_clicks: 1250,
  total_conversions: 125,
  total_spent: 5000,
  ctr: 5.0,
  conversion_rate: 10.0,
  cpc: 4.0,
  cpm: 0.2,
  cost_per_conversion: 40.0,
  avg_position: 1.5,
  first_impression_at: '2024-01-01T10:00:00Z',
  last_impression_at: '2024-01-15T18:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T18:00:00Z'
};

// Mock Driver Profiles
export const mockDriverProfile: DriverProfile = {
  id: 'driver-123',
  user_id: 'user-456',
  city_id: 'city-789',
  driver_name: 'John Doe',
  driver_score: 85.5,
  driver_tier: 'gold',
  verification_status: 'verified',
  activity_level: 'high',
  total_trips: 1250,
  avg_rating: 4.8,
  completion_rate: 95.5,
  acceptance_rate: 90.0,
  cancellation_rate: 2.5,
  on_time_rate: 98.0,
  score_components: {
    rating_score: 88.0,
    completion_score: 95.5,
    acceptance_score: 90.0,
    reliability_score: 92.0
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T18:00:00Z'
};

export const mockDriverProfiles: DriverProfile[] = [
  mockDriverProfile,
  {
    ...mockDriverProfile,
    id: 'driver-456',
    user_id: 'user-789',
    driver_name: 'Jane Smith',
    driver_score: 92.0,
    driver_tier: 'platinum'
  },
  {
    ...mockDriverProfile,
    id: 'driver-789',
    user_id: 'user-012',
    driver_name: 'Bob Johnson',
    driver_score: 75.0,
    driver_tier: 'silver'
  }
];

// Mock Targeting Rules
export const mockTargetingRules: TargetingRules = {
  driver_score_min: 70,
  driver_score_max: 100,
  verification_status: ['verified'],
  activity_level: ['high', 'medium'],
  driver_tier: ['platinum', 'gold']
};

// Mock Audience Estimate
export const mockAudienceEstimate = {
  total_reach: 5000,
  qualified_drivers: 4500,
  estimated_impressions: 25000,
  estimated_cost: 5000,
  recommendations: [
    'Consider widening score range to increase reach',
    'Current targeting is well balanced'
  ]
};

// Helper to create custom mock data
export const createMockCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  ...mockCampaign,
  ...overrides
});

export const createMockDriver = (overrides: Partial<DriverProfile> = {}): DriverProfile => ({
  ...mockDriverProfile,
  ...overrides
});

export const createMockAnalytics = (overrides: Partial<CampaignAnalytics> = {}): CampaignAnalytics => ({
  ...mockAnalytics,
  ...overrides
});
