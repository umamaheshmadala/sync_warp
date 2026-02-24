# STORY 19.6 — Add Indexes for All Unindexed Foreign Key Columns

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** 📋 Ready  
**Priority:** 🟡 Medium  
**Estimate:** 2 story points  
**Dependencies:** None  
**Audit Findings:** 8.6  

---

## 🎯 Goal

Add covering indexes for all foreign key columns identified by the Supabase Performance Advisor as unindexed. Without these indexes, JOINs on foreign keys perform sequential scans, and cascading DELETEs on parent tables become extremely slow as the database scans every row in the child table.

---

## 📍 Current State (What Exists)

### Supabase Performance Advisor Finding

| Lint ID | Name | Level |
|---------|------|-------|
| N/A | `unindexed_foreign_keys` | ⚠️ WARN |

### Affected Tables & Foreign Keys (50+ missing indexes)

| # | Table | Foreign Key Column(s) | References |
|---|-------|----------------------|------------|
| 1 | `ad_campaigns` | `business_id` | `businesses(id)` |
| 2 | `api_usage_logs` | `business_id` | `businesses(id)` |
| 3 | `billing_accounts` | `business_id` | `businesses(id)` |
| 4 | `billing_transactions` | `billing_account_id` | `billing_accounts(id)` |
| 5 | `business_claims` | `business_id`, `claimed_by` | `businesses(id)`, `auth.users(id)` |
| 6 | `business_coupons` | `business_id` | `businesses(id)` |
| 7 | `business_pending_edits` | `business_id`, `submitted_by` | `businesses(id)`, `auth.users(id)` |
| 8 | `business_reviews` | `user_id`, `business_id` | `auth.users(id)`, `businesses(id)` |
| 9 | `business_status_history` | `business_id`, `changed_by` | `businesses(id)`, `auth.users(id)` |
| 10 | `businesses` | `owner_id` | `auth.users(id)` |
| 11 | `campaigns` | `business_id` | `businesses(id)` |
| 12 | `contact_matches` | `user_id`, `matched_user_id` | `auth.users(id)`, `auth.users(id)` |
| 13 | `contact_sync_logs` | `user_id` | `auth.users(id)` |
| 14 | `conversation_mutes` | `conversation_id`, `user_id` | `conversations(id)`, `auth.users(id)` |
| 15 | `coupon_batches` | `coupon_id` | `coupons(id)` |
| 16 | `coupon_lifecycle_events` | `coupon_id` | `coupons(id)` |
| 17 | `coupon_redemptions` | `coupon_id`, `user_id` | `coupons(id)`, `auth.users(id)` |
| 18 | `coupon_shares` | `coupon_id` | `coupons(id)` |
| 19 | `coupon_sharing_log` | `coupon_id`, `shared_by`, `shared_with` | `coupons(id)`, `auth.users(id)` |
| 20 | `coupons` | `business_id` | `businesses(id)` |
| 21 | `dismissed_pymk_suggestions` | `user_id`, `suggested_user_id` | `auth.users(id)` |
| 22 | `driver_algorithm_config` | `business_id` | `businesses(id)` |
| 23 | `favorite_products` | `product_id`, `user_id` | `products(id)`, `auth.users(id)` |
| 24 | `follower_notifications` | `follower_id`, `business_id` | `auth.users(id)`, `businesses(id)` |
| 25 | `follower_reports` | `reporter_id`, `business_id` | `auth.users(id)`, `businesses(id)` |
| 26 | `friend_activities` | `user_id`, `friend_id` | `auth.users(id)` |
| 27 | `media_processing_queue` | `business_id` | `businesses(id)` |
| 28 | `message_edits` | `message_id`, `edited_by` | `messages(id)`, `auth.users(id)` |
| 29 | `message_forwards` | `original_message_id`, `forwarded_by` | `messages(id)`, `auth.users(id)` |
| 30 | `message_reports` | `message_id`, `reporter_id` | `messages(id)`, `auth.users(id)` |
| 31 | `messages` | `conversation_id`, `sender_id` | `conversations(id)`, `auth.users(id)` |
| 32 | `notification_log` | `user_id` | `auth.users(id)` |
| 33 | `offer_audit_log` | `offer_id`, `actor_id` | `offers(id)`, `auth.users(id)` |
| 34 | `offer_lifecycle_events` | `offer_id` | `offers(id)` |
| 35 | `offer_shares` | `offer_id`, `shared_by` | `offers(id)`, `auth.users(id)` |
| 36 | `offer_views` | `offer_id`, `viewer_id` | `offers(id)`, `auth.users(id)` |
| 37 | `offers` | `business_id` | `businesses(id)` |
| 38 | `pinned_messages` | `message_id`, `conversation_id`, `pinned_by` | various |
| 39 | `product_shares` | `product_id`, `shared_by` | `products(id)`, `auth.users(id)` |
| 40 | `product_views` | `product_id`, `viewer_id` | `products(id)`, `auth.users(id)` |
| 41 | `products` | `business_id` | `businesses(id)` |
| 42 | `rate_limit_violations` | `user_id` | `auth.users(id)` |
| 43 | `retention_archives` | `business_id` | `businesses(id)` |
| 44 | `retention_audit_log` | `business_id`, `performed_by` | `businesses(id)`, `auth.users(id)` |
| 45 | `retention_override_requests` | `business_id`, `requested_by` | `businesses(id)`, `auth.users(id)` |
| 46 | `review_moderation_log` | `review_id`, `moderator_id` | `business_reviews(id)`, `auth.users(id)` |
| 47 | `review_reports` | `review_id`, `reporter_id` | `business_reviews(id)`, `auth.users(id)` |
| 48 | `review_requests` | `business_id`, `requester_id` | `businesses(id)`, `auth.users(id)` |
| 49 | `review_shares` | `review_id`, `shared_by` | `business_reviews(id)`, `auth.users(id)` |
| 50 | `share_clicks` | `share_event_id` | `share_events(id)` |
| 51 | `share_events` | `user_id` | `auth.users(id)` |
| 52 | `spam_keywords` | *(check FK)* | — |
| 53 | `spam_patterns` | *(check FK)* | — |
| 54 | `system_settings` | *(check FK)* | — |
| 55 | `typing_indicators` | `conversation_id`, `user_id` | `conversations(id)`, `auth.users(id)` |
| 56 | `user_coupon_collections` | `coupon_id`, `user_id` | `coupons(id)`, `auth.users(id)` |
| 57 | `wishlist_items` | `user_id`, `product_id` | `auth.users(id)`, `products(id)` |

---

## 🔧 Implementation Details

### Migration Approach

Use `CREATE INDEX CONCURRENTLY` to avoid locking tables during index creation. This is critical for production databases with active traffic.

> [!CAUTION]
> `CREATE INDEX CONCURRENTLY` **cannot** run inside a transaction block. Each index must be created as a separate statement. Supabase migrations run inside transactions by default — you may need to use multiple migration files or the Supabase SQL Editor directly.

### Naming Convention

Use `idx_{table}_{column}` format for consistency:

```sql
-- STORY 19.6: Add indexes for unindexed foreign keys
-- Run these OUTSIDE a transaction block (CONCURRENTLY requires this)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_campaigns_business_id
  ON public.ad_campaigns (business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_logs_business_id
  ON public.api_usage_logs (business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_accounts_business_id
  ON public.billing_accounts (business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_transactions_billing_account_id
  ON public.billing_transactions (billing_account_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_claims_business_id
  ON public.business_claims (business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_claims_claimed_by
  ON public.business_claims (claimed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_coupons_business_id
  ON public.business_coupons (business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_pending_edits_business_id
  ON public.business_pending_edits (business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_pending_edits_submitted_by
  ON public.business_pending_edits (submitted_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_reviews_user_id
  ON public.business_reviews (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_reviews_business_id
  ON public.business_reviews (business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_status_history_business_id
  ON public.business_status_history (business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_status_history_changed_by
  ON public.business_status_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_owner_id
  ON public.businesses (owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_business_id
  ON public.campaigns (business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_matches_user_id
  ON public.contact_matches (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_matches_matched_user_id
  ON public.contact_matches (matched_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_sync_logs_user_id
  ON public.contact_sync_logs (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_mutes_conversation_id
  ON public.conversation_mutes (conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_mutes_user_id
  ON public.conversation_mutes (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_batches_coupon_id
  ON public.coupon_batches (coupon_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_lifecycle_events_coupon_id
  ON public.coupon_lifecycle_events (coupon_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_redemptions_coupon_id
  ON public.coupon_redemptions (coupon_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_redemptions_user_id
  ON public.coupon_redemptions (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_shares_coupon_id
  ON public.coupon_shares (coupon_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_sharing_log_coupon_id
  ON public.coupon_sharing_log (coupon_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_sharing_log_shared_by
  ON public.coupon_sharing_log (shared_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_sharing_log_shared_with
  ON public.coupon_sharing_log (shared_with);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_business_id
  ON public.coupons (business_id);

-- ... (continue for ALL remaining tables/columns)
-- Full list covers 70+ individual CREATE INDEX statements
```

> [!NOTE]
> Before creating indexes, verify which indexes already exist to avoid duplicates:
> ```sql
> SELECT tablename, indexname, indexdef
> FROM pg_indexes
> WHERE schemaname = 'public'
> ORDER BY tablename, indexname;
> ```

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Performance Advisor:** Re-run → all `unindexed_foreign_keys` warnings should be resolved
2. **Index count verification:**
   ```sql
   SELECT tablename, COUNT(*) as index_count
   FROM pg_indexes
   WHERE schemaname = 'public'
   GROUP BY tablename
   ORDER BY tablename;
   ```

### Performance Tests

3. **JOIN query performance:** Run `EXPLAIN ANALYZE` on key queries that join these tables → verify Index Scan is used instead of Sequential Scan
4. **Cascading DELETE test:** Delete a business with many related records → verify completion time is reasonable (< 1 second)
5. **No write regression:** Insert/update operations on indexed tables should not show significant performance degradation

---

## ✅ Acceptance Criteria

- [ ] All foreign key columns identified by the Performance Advisor have covering indexes
- [ ] Supabase Performance Advisor reports 0 `unindexed_foreign_keys` warnings
- [ ] `EXPLAIN ANALYZE` on JOIN queries shows Index Scan usage
- [ ] No duplicate indexes created
- [ ] No significant write performance regression
- [ ] Indexes created with `CONCURRENTLY` to avoid table locks

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration(s) | NEW — `CREATE INDEX CONCURRENTLY` for 70+ foreign key columns |

---

## ⚠️ Rollback

Drop specific indexes if they cause issues:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_table_column;
```

Indexes can be dropped without data loss — this only affects query performance.
