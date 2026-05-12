# STORY 19.4 — Pin `search_path` on All Security-Sensitive Functions

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** ✅ Done  
**Priority:** 🟠 High  
**Estimate:** 2 story points  
**Dependencies:** None  
**Audit Findings:** 8.4  

---

## 🎯 Goal

Add `SET search_path = ''` to all functions flagged with a mutable `search_path`. Without this pinning, a malicious actor could create a schema with identically named objects (e.g., a fake `auth.uid()` function) and trick these functions into executing attacker-controlled code — a classic **privilege escalation** attack via search path injection.

---

## 📍 Current State (What Exists)

### Supabase Security Advisor Finding

| Lint ID | Name | Level | Count |
|---------|------|-------|-------|
| `0011` | `function_search_path_mutable` | ⚠️ WARN | **200+ functions** |

### Complete List of Affected Functions

<details>
<summary>Click to expand full list (200+ functions)</summary>

| # | Function Name | Category |
|---|---------------|----------|
| 1 | `unblock_user` | Social |
| 2 | `admin_reject_business` | Admin |
| 3 | `notify_friend_request_push` | Notifications |
| 4 | `get_pymk_suggestions` | Social |
| 5 | `notify_new_message_push` | Notifications |
| 6 | `trigger_recalculate_badge` | Gamification |
| 7 | `handle_review_resubmission` | Reviews |
| 8 | `get_primary_photo` | Media |
| 9 | `search_users_secure` | Search |
| 10 | `create_reverse_friendship` | Social |
| 11 | `update_campaigns_updated_at` | Triggers |
| 12 | `get_product_favorite_count` | Products |
| 13 | `get_pending_review_reminders` | Reviews |
| 14 | `update_product_last_updated` | Triggers |
| 15 | `get_friends_who_liked_product` | Products |
| 16 | `are_friends_v2` | Social |
| 17 | `log_api_usage` | Logging |
| 18 | `delete_coupon_draft` | Coupons |
| 19 | `admin_soft_delete_business` | Admin |
| 20 | `track_ad_click` | Ads |
| 21 | `get_business_review_analytics` | Analytics |
| 22 | `check_user_collected_coupon` | Coupons |
| 23 | `get_business_engagement_log` | Analytics |
| 24 | `prevent_self_vote` | Reviews |
| 25 | `log_collection_lifecycle` | Coupons |
| 26 | `update_updated_at_column` | Triggers |
| 27 | `random_interests` | Test Data |
| 28 | `notify_deal_shared_push` | Notifications |
| 29 | `block_user` | Social |
| 30 | `mark_conversation_as_read` | Messaging |
| 31 | `update_profile_phone_hash` | Profiles |
| 32 | `calculate_campaign_reach` | Ads |
| 33 | `generate_test_users` | Test Data |
| 34 | `increment_offer_click_count` | Offers |
| 35 | `get_user_coupon_count` | Coupons |
| 36 | `get_sharing_limits` | Sharing |
| 37 | `is_in_quiet_hours` | Notifications |
| 38 | `recalculate_driver_score` | Gamification |
| 39 | `recalculate_coupon_stats` | Coupons |
| 40 | `notify_admins_reported_review` | Notifications |
| 41 | `get_coupon_drafts` | Coupons |
| 42 | `get_index_usage` | Admin |
| 43 | `is_notification_type_enabled` | Notifications |
| 44 | `should_send_notification` | Notifications |
| 45 | `cleanup_old_storage_files` | Maintenance |
| 46 | `calculate_driver_score` | Gamification |
| 47 | `get_unread_message_count` | Messaging |
| 48 | `generate_test_messages` | Test Data |
| 49 | `update_favorites_updated_at` | Triggers |
| 50 | `update_review_modified_timestamp` | Triggers |
| 51 | `track_offer_view` | Offers |
| 52 | `get_share_analytics` | Sharing |
| 53 | `update_sharing_limits_timestamp` | Triggers |
| 54 | `get_user_favorites` | Products |
| 55 | `update_reviews_driver_score` | Gamification |
| 56 | `notify_admins_resubmission` | Notifications |
| 57 | `check_retention_eligibility` | Retention |
| 58 | `get_businesses_with_ratings` | Business |
| 59 | `update_user_coupon_collections_updated_at` | Triggers |
| 60 | `check_global_rate_limit` | Rate Limiting |
| 61 | `accept_friend_request_safe` | Social |
| 62 | `update_conversation_timestamp` | Triggers |
| 63 | `admin_approve_business` | Admin |
| 64 | `can_see_online_status` | Social |
| 65 | `get_conversation_messages` | Messaging |
| 66 | `get_user_sharing_analytics` | Sharing |
| 67 | `get_friend_count` | Social |
| 68 | `dismiss_pymk_suggestion` | Social |
| 69 | `unfriend_user` | Social |
| 70 | `fix_coupon_stats` | Coupons |
| 71 | `trigger_refresh_analytics_share_unified` | Analytics |
| 72 | `link_review_to_request` | Reviews |
| 73 | `cleanup_stale_tokens` | Maintenance |
| 74 | `notify_message_recipients` | Notifications |
| 75 | `complete_business_claim` | Business |
| 76 | `get_friend_leaderboard` | Social |
| 77 | `toggle_favorite` | Products |
| 78 | `get_share_analytics_by_method` | Sharing |
| 79 | `random_location_bengaluru` | Test Data |
| 80 | `check_featured_limit` | Products |
| 81 | `log_offer_lifecycle_event` | Offers |
| 82 | `increment_offer_share_count` | Offers |
| 83 | `search_messages` | Messaging (×2 overloads) |
| 84 | `get_review_voters` | Reviews |
| 85 | `log_coupon_share` | Coupons (×2 overloads) |
| 86 | `update_follower_reports_updated_at` | Triggers |
| 87 | `estimate_campaign_reach` | Ads |
| 88 | `get_trending_products` | Products |
| 89 | `validate_checkin_distance` | Checkins |
| 90 | `auto_archive_expired_offers` | Offers |
| 91 | `update_product_like_count` | Products |
| 92 | `get_shareable_coupons` | Coupons |
| 93 | `get_featured_products` | Products |
| 94 | `can_share_to_friend` | Sharing |
| 95 | `save_coupon_draft` | Coupons |
| 96 | `archive_for_retention` | Retention |
| 97 | `send_message` | Messaging |
| 98 | `update_ads_updated_at` | Triggers |
| 99 | `update_notification_settings_updated_at` | Triggers |
| 100 | `update_business_rating` | Business |
| 101 | `send_friend_request` | Social |
| 102 | `are_friends` | Social |
| 103 | `get_top_products_by_views` | Products |
| 104 | `get_deals_liked_by_friends` (×2 overloads) | Social/Deals |
| 105 | `get_business_tag_analysis` | Analytics |
| 106 | `generate_offer_audit_code` | Offers |
| 107 | `get_product_analytics_summary` | Analytics |
| 108 | `update_contact_matches` | Contacts |
| 109 | `check_sharing_limits` | Sharing |
| 110 | `get_user_favorite_products` | Products |
| 111 | `log_contact_sync_event` | Contacts |
| 112 | `check_conversation_rate_limit` | Rate Limiting |
| 113 | `increment_product_share_count` | Products |
| 114 | `get_sharing_stats_today` | Sharing |
| 115 | `get_mutual_friends` (×2 overloads) | Social |
| 116 | `get_visible_online_status` (×2 overloads) | Social |
| 117 | `get_business_report_stats` | Analytics |
| 118 | `can_send_friend_request` | Social |
| 119 | `get_business_review_stats` | Reviews |
| 120 | `admin_restore_business` | Admin |
| 121 | `set_has_been_shared` | Sharing |
| 122 | `run_performance_tests` | Admin |
| 123 | `forward_message_to_conversations` | Messaging |
| 124 | `notify_friend_request_sent` | Notifications |
| 125 | `get_business_claim_status` | Business |
| 126 | `get_coupon_lifecycle` | Coupons |
| 127 | `update_driver_profiles_updated_at` | Triggers |
| 128 | `get_friend_count_v2` | Social |
| 129 | `track_ad_impression` | Ads |
| 130 | `get_review_trends` | Reviews |
| ... | *(and more — see full list in advisor output)* | |

</details>

---

## 🔧 Implementation Details

### Migration Approach

Use `ALTER FUNCTION ... SET search_path = ''` for each function. This is a metadata-only change — it does not modify function bodies or require recreation.

> [!NOTE]
> An empty `search_path` (`''`) means all schema references inside the function must be fully qualified (e.g., `public.contact_hashes`, `auth.uid()`). Most functions already use qualified names. If any function body uses unqualified table/function references, it will fail at runtime after pinning. Test each function.

### Batch ALTER Script

```sql
-- STORY 19.4: Pin search_path on all security-sensitive functions
-- This prevents privilege escalation via search_path injection.

-- Social functions
ALTER FUNCTION public.unblock_user SET search_path = '';
ALTER FUNCTION public.block_user SET search_path = '';
ALTER FUNCTION public.send_friend_request SET search_path = '';
ALTER FUNCTION public.accept_friend_request_safe SET search_path = '';
ALTER FUNCTION public.reject_friend_request SET search_path = '';
ALTER FUNCTION public.unfriend_user SET search_path = '';
ALTER FUNCTION public.remove_friend SET search_path = '';
ALTER FUNCTION public.create_reverse_friendship SET search_path = '';
ALTER FUNCTION public.are_friends SET search_path = '';
ALTER FUNCTION public.are_friends_v2 SET search_path = '';
ALTER FUNCTION public.get_friend_count SET search_path = '';
ALTER FUNCTION public.get_friend_count_v2 SET search_path = '';
ALTER FUNCTION public.get_mutual_friends SET search_path = '';
ALTER FUNCTION public.get_pymk_suggestions SET search_path = '';
ALTER FUNCTION public.dismiss_pymk_suggestion SET search_path = '';
ALTER FUNCTION public.can_send_friend_request SET search_path = '';
ALTER FUNCTION public.get_friend_leaderboard SET search_path = '';
ALTER FUNCTION public.can_see_online_status SET search_path = '';
ALTER FUNCTION public.get_visible_online_status SET search_path = '';
ALTER FUNCTION public.can_view_profile SET search_path = '';
ALTER FUNCTION public.can_share_to_friend SET search_path = '';
ALTER FUNCTION public.can_message_user SET search_path = '';

-- Messaging functions
ALTER FUNCTION public.send_message SET search_path = '';
ALTER FUNCTION public.mark_conversation_as_read SET search_path = '';
ALTER FUNCTION public.get_unread_message_count SET search_path = '';
ALTER FUNCTION public.get_conversation_messages SET search_path = '';
ALTER FUNCTION public.search_messages SET search_path = '';
ALTER FUNCTION public.create_or_get_conversation SET search_path = '';
ALTER FUNCTION public.forward_message_to_conversations SET search_path = '';
ALTER FUNCTION public.delete_conversation_for_user SET search_path = '';
ALTER FUNCTION public.undo_delete_conversation SET search_path = '';
ALTER FUNCTION public.clear_chat_history SET search_path = '';
ALTER FUNCTION public.mute_conversation SET search_path = '';
ALTER FUNCTION public.unmute_conversation SET search_path = '';
ALTER FUNCTION public.is_conversation_muted SET search_path = '';
ALTER FUNCTION public.get_conversation_recipient SET search_path = '';
ALTER FUNCTION public.mark_message_as_read SET search_path = '';
ALTER FUNCTION public.get_messages_v2 SET search_path = '';
ALTER FUNCTION public.update_conversation_timestamp SET search_path = '';
ALTER FUNCTION public.check_conversation_rate_limit SET search_path = '';
ALTER FUNCTION public.refresh_conversation_stats SET search_path = '';

-- Admin functions
ALTER FUNCTION public.admin_reject_business SET search_path = '';
ALTER FUNCTION public.admin_approve_business SET search_path = '';
ALTER FUNCTION public.admin_soft_delete_business SET search_path = '';
ALTER FUNCTION public.admin_restore_business SET search_path = '';
ALTER FUNCTION public.admin_hard_delete_business SET search_path = '';

-- ... (continue for ALL remaining functions)
-- Complete list must be generated from the full advisor output
```

> [!IMPORTANT]
> Some functions have **overloaded signatures** (e.g., `search_messages`, `log_coupon_share`, `get_mutual_friends`, `get_visible_online_status`, `get_deals_liked_by_friends`). Each overload must be altered separately. Use the full function signature if needed:
> ```sql
> ALTER FUNCTION public.search_messages(text, uuid) SET search_path = '';
> ALTER FUNCTION public.search_messages(text) SET search_path = '';
> ```

### Post-Pin Verification Script

Run each function with a test call to ensure no unqualified references break:

```sql
-- Example: Verify send_message still works
SELECT public.send_message(
  p_conversation_id := 'test-uuid'::uuid,
  p_content := 'test',
  p_message_type := 'text'
);
```

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Security Advisor:** Re-run → all `function_search_path_mutable` warnings should be resolved
2. **Function property check:**
   ```sql
   SELECT proname, proconfig
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
     AND proconfig IS NOT NULL
     AND 'search_path=' = ANY(proconfig);
   ```

### Functional Tests

3. **Messaging:** Send a message → verify it works
4. **Friend requests:** Send → accept → verify
5. **Coupons:** Create/share/redeem → verify
6. **Admin operations:** Approve/reject business → verify
7. **Notifications:** Trigger a notification → verify delivery

---

## ✅ Acceptance Criteria

- [x] All 200+ functions have `SET search_path = ''` in their config
- [x] Supabase Security Advisor reports 0 `function_search_path_mutable` warnings
- [x] All existing function calls still work correctly (no unqualified reference errors)
- [x] Overloaded functions are individually pinned
- [x] Application smoke tests pass for messaging, social, coupons, admin, and notification features

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration | NEW — `ALTER FUNCTION ... SET search_path = ''` for all 200+ functions |

---

## ⚠️ Rollback

Reset search_path for any broken functions:

```sql
ALTER FUNCTION public.function_name RESET search_path;
```
