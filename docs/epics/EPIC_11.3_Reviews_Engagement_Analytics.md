# EPIC 11.3: Reviews Module - Engagement & Analytics

**Epic ID**: EPIC_11.3_Reviews_Engagement_Analytics  
**Parent**: [EPIC 11 Reviews Master](./EPIC_11_Reviews_Module_Revamp.md)  
**Created**: January 18, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION  
**Duration**: Week 5-7  
**Effort**: 19 days  
**Priority**: 🟡 MEDIUM

---

## Objective

Add engagement features (helpful votes, sharing, review requests) and comprehensive analytics dashboards for both businesses and users.

---

## Stories

| Story | Title | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| 11.3.1 | Helpful Vote System (Public Votes, Always Show Count) | 3 days | 🟡 Medium | ✅ Completed |
| 11.3.2 | Review Request After Check-in + 4hr Reminder | 2 days | 🟡 Medium | ✅ Completed |
| 11.3.3 | Share Review to Friends | 2 days | 🟢 Low | ✅ Completed |
| 11.3.4 | Business Review Analytics Dashboard | 5 days | 🟡 Medium | ✅ Completed |
| 11.3.5 | Response Time Tracking Badge | 1 day | 🟢 Low | ⏭️ Skipped (Phase II) |
| 11.3.6 | Featured/Pinned Reviews | 1 day | 🟢 Low | ✅ Completed |
| 11.3.7 | All Reviews Page (Infinite Scroll + Route) | 2 days | 🟡 Medium | ✅ Completed |
| 11.3.8 | Push Notifications for Responses | 1 day | 🟡 Medium | |
| 11.3.9 | User Review Insights (Impact Metrics, History) | 2 days | 🟢 Low | |

**Total: 9 stories, 19 days effort**

---

## Design Decisions (Phase 3 Specific)

### Helpful Vote System

- **Button**: Single "Helpful" button (Google-style)
- **Visibility**: **PUBLIC** - show who voted
- **Display**: Always show count (no threshold)
- **Sorting**: "Most Helpful" option in filters

### Private Messaging Rules

- Business **CANNOT** initiate conversation with reviewer
- User can start conversation via **existing chat/messaging system**
- Business can reply once user initiates
- User can opt out of specific conversation

### User Insights

Features for reviewers in their profile:
- **My Reviews page** (exists - `MyReviewsPage.tsx`)
- **Review impact metrics** (helpful counts, views)
- **Contribution history** timeline
- **NO** reviewer rank/level system
- **NO** badges earned display

### Real-time Features

| Feature | Description |
|---------|-------------|
| Instant review appearance | New reviews appear without refresh |
| Live helpful vote counts | Vote counts update in real-time |
| Real-time response notifications | User notified when business responds |
| Live review count on storefront | Count updates immediately |

---

## Business Analytics Dashboard (Story 11.3.4)

All metrics required for business owners:
- Review volume over time (graph)
- Recommendation trend (improving/declining)
- Tag analysis (praised/criticized aspects)
- Comparison to category average
- Response rate metrics
- Sentiment analysis (if AI feasible)
- Peak review times
- Reviewer demographics
- Competitor comparison (if data available)
- Review source tracking

---

## Database Schema (New Tables)

```sql
-- Helpful votes table
CREATE TABLE review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- RLS Policies
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can vote once per review" ON review_helpful_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Dependencies

- **Story 11.3.1** (Helpful Votes) depends on EPIC 11.1.1 (Write Review Button)
- **Story 11.3.2** (Review Request) depends on EPIC 11.1.1 and 11.1.2 (GPS)

---

## Story Files

Story files will be created during implementation phase.
