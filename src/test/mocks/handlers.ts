/**
 * MSW Handlers
 * Mock API request handlers for testing
 */

import { http, HttpResponse } from 'msw';
import {
  mockCampaigns,
  mockCampaign,
  mockAnalytics,
  mockDriverProfiles,
  mockDriverProfile,
  mockAudienceEstimate
} from './data';

const SUPABASE_URL = 'https://*.supabase.co';

export const handlers = [
  // Get all campaigns
  http.get(`${SUPABASE_URL}/rest/v1/campaigns`, () => {
    return HttpResponse.json(mockCampaigns);
  }),

  // Get single campaign
  http.get(`${SUPABASE_URL}/rest/v1/campaigns/:id`, ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);
    if (campaign) {
      return HttpResponse.json(campaign);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Create campaign
  http.post(`${SUPABASE_URL}/rest/v1/campaigns`, async ({ request }) => {
    const body = await request.json();
    const newCampaign = {
      ...mockCampaign,
      ...(body as any),
      id: `campaign-${Date.now()}`
    };
    return HttpResponse.json(newCampaign, { status: 201 });
  }),

  // Update campaign
  http.patch(`${SUPABASE_URL}/rest/v1/campaigns/:id`, async ({ request, params }) => {
    const body = await request.json();
    const campaign = mockCampaigns.find(c => c.id === params.id);
    if (campaign) {
      const updated = { ...campaign, ...(body as any) };
      return HttpResponse.json(updated);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Delete campaign
  http.delete(`${SUPABASE_URL}/rest/v1/campaigns/:id`, ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);
    if (campaign) {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Get campaign analytics
  http.get(`${SUPABASE_URL}/rest/v1/campaign_analytics`, () => {
    return HttpResponse.json(mockAnalytics);
  }),

  // Get driver profiles
  http.get(`${SUPABASE_URL}/rest/v1/driver_profiles`, () => {
    return HttpResponse.json(mockDriverProfiles);
  }),

  // Get single driver profile
  http.get(`${SUPABASE_URL}/rest/v1/driver_profiles/:id`, ({ params }) => {
    const driver = mockDriverProfiles.find(d => d.user_id === params.id);
    if (driver) {
      return HttpResponse.json(driver);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Estimate audience reach (RPC call)
  http.post(`${SUPABASE_URL}/rest/v1/rpc/estimate_audience_reach`, () => {
    return HttpResponse.json(mockAudienceEstimate);
  }),

  // Get top drivers (RPC call)
  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_top_drivers`, () => {
    return HttpResponse.json(mockDriverProfiles.slice(0, 10));
  }),

  // Calculate driver score (RPC call)
  http.post(`${SUPABASE_URL}/rest/v1/rpc/calculate_driver_score`, () => {
    return HttpResponse.json({ score: 85.5 });
  })
];
