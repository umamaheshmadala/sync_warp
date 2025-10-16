# 🚀 Next Steps - Campaign System Testing

## Quick Start (2 minutes)

### Execute the Testing Script

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo
   ```

2. **Run the Script**
   - Open: `scripts/create_sample_campaigns.sql`
   - Copy all contents
   - Paste into SQL Editor
   - Click "Run"

## What This Script Does

### ✅ Creates 2 Sample Campaigns

1. **Welcome New Users** ($50,000 budget)
   - Type: Engagement
   - Target: Customers in Mumbai, Delhi, Bangalore
   - Criteria: Profile completion ≥ 50%
   - Duration: 30 days

2. **Power User Rewards** (₹100,000 budget)
   - Type: Reward
   - Target: Top 10% most active users ("Drivers")
   - Criteria: Activity score ≥ 3000, Top 10% per city
   - Duration: 90 days
   - Note: "Drivers" = power users who drive word-of-mouth, NOT taxi drivers!

### 📊 Tests Driver Algorithm

- Score distribution by tier (Bronze/Silver/Gold/Platinum)
- Top 10 drivers by score
- City rankings and percentiles
- Activity breakdown (coupons, checkins, reviews)

### 🎯 Tests Campaign Targeting

- Finds eligible power users ("Drivers") for rewards (score ≥ 3000, top 10%)
- Finds eligible customers for Welcome Campaign
- Shows how many users match each campaign's criteria

### ✅ Verifies System Integration

- Checks campaign_analytics table schema
- Checks campaign_targets table schema
- Provides summary statistics

## Expected Results

### Campaign Creation
```
2 campaigns created successfully
- Welcome New Users (active)
- Driver Rewards Program (active)
```

### Driver Score Distribution
```
| Tier | Count | Avg Score |
|------|-------|-----------|
| Bronze (0-2000) | ~3 | ~1,500 |
| Silver (2000-5000) | ~7 | ~3,500 |
| Gold (5000-8000) | ~3 | ~6,500 |
| Platinum (8000+) | ~2 | ~9,500 |
```

### Eligible Users
- **Power Users ("Drivers")**: 8-10 top 10% active users
- **Welcome Campaign**: 50-70 customers

### 📖 Understanding "Drivers"
"Drivers" in SynC are **NOT taxi drivers**! They are:
- Top 10% most active users per city
- Power users who "drive" word-of-mouth marketing
- Measured by: coupon sharing, check-ins, reviews, social activity

## Next Actions After Running Script

### 1. Review Campaign Performance
```sql
SELECT name, impressions, clicks, conversions,
       total_budget_cents/100 as budget_dollars
FROM campaigns;
```

### 2. Create Campaign Targets
```sql
-- Manually assign users to campaigns
INSERT INTO campaign_targets (id, campaign_id, user_id, matched_criteria, is_driver)
SELECT gen_random_uuid(), 
       (SELECT id FROM campaigns WHERE name = 'Driver Rewards Program'),
       p.id, 
       '{"score": "3000+", "city": "matched"}'::jsonb,
       true
FROM profiles p
JOIN driver_profiles dp ON p.id = dp.user_id
WHERE dp.total_activity_score >= 3000
LIMIT 10;
```

### 3. Test Campaign Analytics
```sql
-- Create sample analytics entry
INSERT INTO campaign_analytics (
  id, campaign_id, recorded_at, time_bucket,
  impressions, clicks, conversions, spent_cents
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM campaigns LIMIT 1),
  NOW(),
  'daily',
  100, 25, 5, 5000
);
```

## Verification Checklist

- [ ] 2 campaigns created successfully
- [ ] Driver scores distributed across tiers
- [ ] Top drivers identified with rankings
- [ ] Campaign targeting works correctly
- [ ] Eligible users found for both campaigns
- [ ] campaign_analytics table ready
- [ ] campaign_targets table ready
- [ ] Summary statistics showing correct counts

## Troubleshooting

### If campaigns don't insert:
**Check RLS policies**:
```sql
-- Temporarily disable RLS on campaigns
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- Re-run campaign inserts
-- Re-enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
```

### If no drivers found:
**Verify driver data**:
```sql
SELECT COUNT(*) FROM driver_profiles;
SELECT MIN(total_activity_score), MAX(total_activity_score) 
FROM driver_profiles;
```

## Success Criteria

✅ **2 active campaigns** created  
✅ **15 driver profiles** with score distribution  
✅ **8-10 high-score drivers** (3000+) eligible for rewards  
✅ **50-70 customers** eligible for welcome campaign  
✅ **All tables** properly configured and ready  

---

**Ready?** Open Supabase SQL Editor and run `scripts/create_sample_campaigns.sql`! 🎯
