# Targeting Demo - Understanding "Drivers"

## 🚨 IMPORTANT: What are "Drivers"?

### Drivers ≠ Taxi/Rideshare Drivers!

In **SynC**, "Drivers" refer to:

### 🌟 **Power Users (Top 10% Most Active per City)**

"Drivers" are users who **DRIVE**:
- 🚀 Word-of-mouth marketing
- 👥 Social engagement and viral growth
- 🏪 Footfall to local businesses
- 💬 Community buzz and recommendations

### How Users Become Drivers

Users earn "Driver" status by being in the **top 10% most active** in their city, measured by:

| Activity | Weight | Description |
|----------|--------|-------------|
| **Coupon Sharing** | 30% | Sharing coupons with friends |
| **Coupon Collecting** | 20% | Discovering and collecting offers |
| **Check-ins** | 15% | Visiting businesses and checking in |
| **Coupon Redemption** | 15% | Actually using the coupons collected |
| **Reviews** | 10% | Writing recommendations (👍/👎 + note) |
| **Social Interactions** | 10% | Friend connections, activity feed engagement |

### Why They're Called "Drivers"

The name reflects their role in **driving**:
1. **Viral Growth** - Through coupon sharing
2. **Trust** - Through authentic reviews
3. **Discovery** - By checking in and recommending businesses
4. **Engagement** - By being active community members

### Business Value of Targeting Drivers

When merchants target "Drivers," they're reaching:
- ✅ **Influencers** in their local community
- ✅ **Early Adopters** who try new things
- ✅ **Advocates** who share and recommend
- ✅ **High-Value Users** with proven engagement

### Example Driver Profile

```
Name: Priya Kumar
City: Mumbai
Activity Score: 8,547
City Rank: #42 out of 15,000 users
Percentile: 99.7% (Top 0.3%)
Status: ✅ Driver (Top 10%)

Activity Breakdown:
- Coupons Collected: 247
- Coupons Shared: 523 (2.1x collection rate!)
- Check-ins: 89
- Reviews Written: 34
- Friend Connections: 67

Why She's Valuable:
→ Shares 2x more than she collects
→ Active reviewer (builds trust)
→ Large friend network (reach)
→ Regular check-ins (drives footfall)
```

## Campaign Targeting Options

### 1. Target All Users
- Broadest reach
- Good for awareness campaigns
- Lower engagement rates

### 2. Target Drivers Only
- Reach top 10% power users
- Higher engagement & sharing rates
- More likely to act and advocate
- Premium targeting option

### 3. Target High-Activity Users
- Users with activity score > threshold
- Not necessarily top 10%, but active
- Balance of reach and engagement

### 4. Demographic + Driver Combination
- Drivers in specific age ranges
- Drivers in specific income brackets
- Drivers with specific interests
- Most precise targeting

## Targeting Demo Features

The `/demo/targeting` page demonstrates:

1. **TargetingEditor** - Configure audience criteria
2. **ReachEstimator** - See estimated audience size
3. **TargetingValidator** - Check for conflicts/issues
4. **RecommendationCard** - AI-suggested targeting

### Sample Targeting Configurations

#### Example 1: Welcome New Users
```json
{
  "demographics": {
    "age_ranges": ["18-24", "25-34"],
    "income_levels": ["medium", "high"]
  },
  "location": {
    "cities": ["Mumbai", "Delhi", "Bangalore"]
  },
  "behavior": {
    "min_activity_score": 0,
    "drivers_only": false
  }
}
```

#### Example 2: Power User Rewards
```json
{
  "demographics": {
    "age_ranges": ["25-34", "35-44"]
  },
  "location": {
    "cities": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai"]
  },
  "behavior": {
    "min_activity_score": 3000,
    "drivers_only": true  // Top 10% only!
  }
}
```

## Driver Algorithm Configuration

Platform admins can configure Driver scoring via the Command Centre:

```typescript
interface DriverAlgorithmConfig {
  coupons_collected_weight: number;    // Default: 20%
  coupons_shared_weight: number;       // Default: 30%
  coupons_redeemed_weight: number;     // Default: 15%
  checkins_weight: number;             // Default: 15%
  reviews_weight: number;              // Default: 10%
  social_interactions_weight: number;  // Default: 10%
  
  driver_percentile_threshold: number; // Default: 90 (top 10%)
  calculation_window_days: number;     // Default: 90 days
  min_activities_threshold: number;    // Default: 10 activities
}
```

## Key Takeaways

1. ✅ **Drivers = Power Users** (not taxi drivers)
2. ✅ **Top 10% by Activity** per city
3. ✅ **Drive Word-of-Mouth** marketing
4. ✅ **Configurable Scoring** by admin
5. ✅ **Premium Targeting** option for merchants

---

**Ready to test?** Run the targeting demo at `http://localhost:5173/demo/targeting`
