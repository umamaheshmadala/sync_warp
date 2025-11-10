-- Demo Data Setup for Follower Targeting System
-- This script creates realistic sample data to demonstrate the features

-- Note: Run this after ensuring you have at least one business and some users in your database

-- 1. Create demo followers (assuming business_id exists)
DO $$
DECLARE
  demo_business_id UUID;
  demo_user_ids UUID[];
BEGIN
  -- Get the first business for demo purposes
  SELECT id INTO demo_business_id FROM businesses LIMIT 1;
  
  IF demo_business_id IS NULL THEN
    RAISE EXCEPTION 'No businesses found. Please create a business first.';
  END IF;

  -- Get some user IDs for demo
  SELECT ARRAY_AGG(id) INTO demo_user_ids 
  FROM profiles 
  LIMIT 5;

  -- Create follower relationships
  IF array_length(demo_user_ids, 1) > 0 THEN
    FOREACH demo_user_id IN ARRAY demo_user_ids LOOP
      INSERT INTO business_followers (business_id, user_id, notification_preferences)
      VALUES (
        demo_business_id,
        demo_user_id,
        jsonb_build_object(
          'new_offers', true,
          'new_coupons', true,
          'new_products', true,
          'announcements', true
        )
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

END $$;

-- 2. Create a sample campaign
INSERT INTO campaigns (
  business_id,
  name,
  description,
  campaign_type,
  targeting_rules,
  target_drivers_only,
  estimated_reach,
  total_budget_cents,
  cost_per_impression_cents,
  cost_per_click_cents,
  start_date,
  end_date,
  status
)
SELECT 
  id as business_id,
  'New Product Launch Campaign',
  'Targeting our engaged followers with our exciting new product line',
  'product_announcement',
  jsonb_build_object(
    'follower_engagement', 'high',
    'min_follow_days', 7,
    'interests', ARRAY['shopping', 'fashion', 'lifestyle']
  ),
  false,
  100,
  50000, -- $500 budget
  10,    -- $0.10 per impression
  50,    -- $0.50 per click
  NOW(),
  NOW() + INTERVAL '30 days',
  'active'
FROM businesses
LIMIT 1
ON CONFLICT DO NOTHING;

-- 3. Create sample campaign metrics
INSERT INTO campaign_metrics (
  campaign_id,
  metric_date,
  impressions,
  clicks,
  conversions,
  revenue,
  cost
)
SELECT 
  c.id as campaign_id,
  CURRENT_DATE - (INTERVAL '1 day' * generate_series::int) as metric_date,
  floor(random() * 100 + 50)::int as impressions,
  floor(random() * 20 + 5)::int as clicks,
  floor(random() * 5 + 1)::int as conversions,
  (random() * 100 + 50)::numeric(10,2) as revenue,
  (random() * 30 + 10)::numeric(10,2) as cost
FROM campaigns c
CROSS JOIN generate_series(0, 6) -- Last 7 days
LIMIT 7
ON CONFLICT (campaign_id, metric_date) DO NOTHING;

-- 4. Create a follower update
INSERT INTO follower_updates (
  business_id,
  update_type,
  title,
  content,
  target_followers,
  scheduled_for,
  status
)
SELECT 
  id as business_id,
  'announcement',
  'Welcome to Our Community!',
  'Thank you for following us! We''re excited to share exclusive offers and updates with you.',
  'all',
  NOW() + INTERVAL '1 hour',
  'scheduled'
FROM businesses
LIMIT 1
ON CONFLICT DO NOTHING;

-- 5. Show summary
SELECT 
  'Demo data created successfully!' as message,
  (SELECT COUNT(*) FROM business_followers) as total_followers,
  (SELECT COUNT(*) FROM campaigns) as total_campaigns,
  (SELECT COUNT(*) FROM campaign_metrics) as total_metrics,
  (SELECT COUNT(*) FROM follower_updates) as total_updates;
