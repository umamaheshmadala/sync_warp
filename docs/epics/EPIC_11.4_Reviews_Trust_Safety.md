# EPIC 11.4: Reviews Module - Trust & Safety

**Epic ID**: EPIC_11.4_Reviews_Trust_Safety  
**Parent**: [EPIC 11 Reviews Master](./EPIC_11_Reviews_Module_Revamp.md)  
**Created**: January 18, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION  
**Duration**: Week 8-10  
**Effort**: 18.5 days  
**Priority**: 🔴 CRITICAL

---

## Objective

Implement comprehensive trust and safety measures including pre-moderation, fraud detection, reporting system, and admin tools.

---

## Stories

| Story | Title | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| 11.4.1 | Pre-Moderation System (Review Queue) | 4 days | 🔴 Critical | ✅ Completed |
| 11.4.2 | Report Review System | 2 days | 🟡 Medium | 📋 Pending |
| 11.4.3 | Admin Moderation Dashboard | 4 days | 🟡 Medium | 📋 Pending |
| 11.4.4 | Fraud Detection (Velocity, IP) | 3 days | 🟡 Medium | 📋 Pending |
| 11.4.5 | Business Recommendation Badges (3 Tiers) | 1 day | 🟢 Low | 📋 Pending |
| 11.4.6 | Verified GPS Badge on Reviews | 0.5 days | 🟢 Low | 📋 Pending |
| 11.4.7 | Filter by Review Score in Search | 1 day | 🟡 Medium | 📋 Pending |
| 11.4.8 | Admin Review Analytics Dashboard | 3 days | 🟡 Medium | 📋 Pending |

**Total: 8 stories, 18.5 days effort**

---

## Design Decisions (Phase 4 Specific)

### Pre-Moderation System

- All reviews held for admin approval before public display
- Status: `pending` → `approved` / `rejected`
- Immediate notifications to admins for new reviews

### Report Review System

- **Report reasons**: Spam, Abusive, Fake, Offensive, Irrelevant
- **Anonymous reports**: NO - account required
- Track report history per user
- Multiple reports → higher priority in queue

### Recommendation Badges (3 Tiers)

| Badge | Threshold | Minimum Reviews |
|-------|-----------|-----------------|
| **Recommended** | 75%+ | 3 reviews |
| **Highly Recommended** | 90%+ | 3 reviews |
| **Very Highly Recommended** | 95%+ | 3 reviews |

### Fraud Detection

- **Velocity monitoring**: Flag users submitting many reviews quickly
- **IP tracking**: Detect multiple accounts from same IP
- **Device fingerprinting**: Track device patterns

### Search Integration

- **Review → Search ranking**: NO (review scores do NOT affect search position)
- **Filter by review in search**: YES (Story 11.4.7)
- **Review preview in search**: NO
- **Review tab location**: Separate tab in storefront (keep current)

---

## Admin Analytics Dashboard (Story 11.4.8)

All metrics required for platform admins:
- Total platform review volume
- Review trends over time
- Most reviewed businesses
- Review quality metrics
- Moderation statistics
- Fake review detection rates
- Response rate by business category
- User engagement with reviews
- Geographic review distribution

---

## AI Features (Research Phase)

The following features will be researched for feasibility and included **only if viable**:

| Feature | Purpose | Status |
|---------|---------|--------|
| AI Photo Moderation | Auto-detect inappropriate images | Research TBD |
| AI Review Summary | Generate business overview | Research TBD |
| AI Authenticity Scoring | Detect fake reviews | Research TBD |
| Sentiment Analysis | Tag analysis from text | Research TBD |
| AI Pre-screening | Moderate before human review | Research TBD |

---

## Database Schema (New Tables)

```sql
-- Review reports table
CREATE TABLE review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abusive', 'fake', 'offensive', 'irrelevant')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, reporter_id)
);

-- Add moderation fields to reviews
ALTER TABLE business_reviews
ADD COLUMN moderation_status TEXT DEFAULT 'pending' 
  CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN moderated_by UUID REFERENCES profiles(id),
ADD COLUMN moderated_at TIMESTAMPTZ,
ADD COLUMN rejection_reason TEXT;

-- Fraud detection tracking
CREATE TABLE review_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Dependencies

- **Story 11.4.2** (Report System) depends on 11.4.1 (Pre-Moderation)
- **Story 11.4.3** (Admin Dashboard) depends on 11.4.1 and 11.4.2
- **Story 11.4.4** (Fraud Detection) depends on 11.4.1
- Can start in parallel with EPIC 11.3

---

## Story Files

Story files will be created during implementation phase.
