# Driver Score Algorithm

## Overview
The Driver Score identifies the most engaged users on the platform. It is a gamified metric that rewards users for high-quality interactions like visiting businesses, writing reviews, and sharing coupons.

## Scoring Components

| Factor | Weight | Description |
|--------|--------|-------------|
| **Reviews** | **2.0** | Reviews submitted (verified or unverified) |
| Check-ins | 2.0 | GPS-verified business visits |
| Coupons Collected | 1.0 | Number of coupons saved to wallet |
| Coupons Shared | 2.0 | Coupons shared with friends (via link/social) |
| Coupons Redeemed | 3.0 | Coupons actually used at a business |
| Social Interactions | 1.0 | Likes, comments, and friend adds |

## Calculation Formula

The total score is calculated as a weighted sum of all activities:

```sql
total_score = (collected * 1.0) 
            + (shared * 2.0) 
            + (redeemed * 3.0) 
            + (checkins * 2.0) 
            + (reviews * 2.0) 
            + (social * 1.0)
```

## Badge Eligibility: The Driver

The "Driver" status represents the top influencers on the platform.

- **Gold Ring Badge**: Awarded to the **Top 10%** of users by `total_activity_score`.
- **Update Frequency**: Real-time (via triggers) and periodic bulk recalculation.
- **Visibility**: The partial or full gold ring is displayed on the user's avatar in feeds, profiles, and reviews.

## Technical Implementation

- **Database Table**: `driver_profiles`
- **Updates**: 
  - Real-time `AFTER INSERT/UPDATE/DELETE` triggers on `business_reviews`, `checkins`, etc.
  - Manual recalculation via `recalculate_driver_score(user_id)` RPC function.
- **Constraint**: Unique on `(user_id, city_id)` - scores are tracked per city context (though currently aggregated logic is used).
