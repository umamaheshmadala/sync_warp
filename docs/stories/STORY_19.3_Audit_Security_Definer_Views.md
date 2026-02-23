# STORY 19.3 — Audit SECURITY DEFINER Views and Convert to SECURITY INVOKER

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 3 story points  
**Dependencies:** None  
**Audit Findings:** 8.3  

---

## 🎯 Goal

Audit all 10 views flagged with `SECURITY DEFINER` and convert them to `SECURITY INVOKER` where safe. `SECURITY DEFINER` views execute with the **permissions of the view creator** (typically the `postgres` superuser), completely bypassing RLS policies on the underlying tables. This means any user querying these views sees all data, regardless of RLS restrictions.

Converting to `SECURITY INVOKER` makes views respect the **calling user's** permissions and RLS policies, closing a privilege escalation vector.

---

## 📍 Current State (What Exists)

### Supabase Security Advisor Finding

| Lint ID | Name | Level |
|---------|------|-------|
| `0010` | `security_definer_view` | 🔴 ERROR |

### Affected Views (10 total)

| # | View | Purpose | Conversion Risk |
|---|------|---------|-----------------|
| 1 | `business_followers_readable` | Display follower data for businesses | 🟢 Low — underlying tables have RLS |
| 2 | `businesses_readable` | Public-facing business listing | 🟡 Medium — may need to allow public reads via underlying RLS |
| 3 | `user_friends` | Friendship list for current user | 🟢 Low — should filter by `auth.uid()` |
| 4 | `sharing_analytics` | Analytics for shared content | 🟡 Medium — business owners should see own analytics |
| 5 | `conversation_list` | User's conversation list | 🟢 Low — must filter by current user |
| 6 | `unread_notifications` | User's unread notification count | 🟢 Low — must filter by current user |
| 7 | `business_reviews_with_details` | Reviews with user/business details | 🟡 Medium — public reviews should be visible |
| 8 | `user_review_activity` | User's review history | 🟢 Low — should filter by `auth.uid()` |
| 9 | `pending_friend_requests` | Pending friend requests for user | 🟢 Low — must filter by current user |
| 10 | `in_app_notifications` | In-app notification feed | 🟢 Low — must filter by current user |

### Impact of Current State

- These views bypass all RLS policies on their underlying tables
- Any authenticated user querying these views could potentially access data belonging to other users
- This is a **privilege escalation risk** — even if the app filters by `auth.uid()`, the database does NOT enforce it

---

## 🔧 Implementation Details

### Step 1: Audit Each View

Before converting, inspect each view's SQL definition to understand:
1. Does the view already filter by `auth.uid()`?
2. What tables does it join, and do those tables have proper RLS?
3. Will converting break any expected behavior?

```sql
-- Inspect view definition
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'business_followers_readable', 'businesses_readable', 'user_friends',
    'sharing_analytics', 'conversation_list', 'unread_notifications',
    'business_reviews_with_details', 'user_review_activity',
    'pending_friend_requests', 'in_app_notifications'
  );
```

### Step 2: Convert Views to SECURITY INVOKER

For each view that is safe to convert (expected: all 10):

```sql
-- STORY 19.3: Convert SECURITY DEFINER views to SECURITY INVOKER
-- This makes views respect the calling user's RLS policies.

ALTER VIEW public.business_followers_readable SET (security_invoker = on);
ALTER VIEW public.businesses_readable SET (security_invoker = on);
ALTER VIEW public.user_friends SET (security_invoker = on);
ALTER VIEW public.sharing_analytics SET (security_invoker = on);
ALTER VIEW public.conversation_list SET (security_invoker = on);
ALTER VIEW public.unread_notifications SET (security_invoker = on);
ALTER VIEW public.business_reviews_with_details SET (security_invoker = on);
ALTER VIEW public.user_review_activity SET (security_invoker = on);
ALTER VIEW public.pending_friend_requests SET (security_invoker = on);
ALTER VIEW public.in_app_notifications SET (security_invoker = on);
```

### Step 3: Verify Underlying RLS Policies

After conversion, the views will rely on the RLS policies of their underlying tables. Verify:
- The underlying tables have proper RLS policies that grant SELECT access for the expected use cases
- If any underlying table lacks proper policies (see Story 19.2), complete that story first

> [!WARNING]
> If a view joins tables that currently lack RLS policies (from Story 19.2), converting to `SECURITY INVOKER` will cause the view to return empty results for those joined tables. Coordinate with Story 19.2 to ensure policies are in place.

### Decision Log

For each view, document whether it was converted and any justification if not:

| View | Converted? | Justification |
|------|-----------|---------------|
| `business_followers_readable` | ✅ Yes | Underlying tables have RLS |
| `businesses_readable` | ✅ Yes | Public data, underlying RLS allows reads |
| `user_friends` | ✅ Yes | Filters by user, RLS enforces ownership |
| `sharing_analytics` | ✅ Yes | Business-scoped, RLS enforces ownership |
| `conversation_list` | ✅ Yes | User-scoped, RLS enforces membership |
| `unread_notifications` | ✅ Yes | User-scoped, RLS enforces ownership |
| `business_reviews_with_details` | ✅ Yes | Public reviews, RLS allows reads |
| `user_review_activity` | ✅ Yes | User-scoped, RLS enforces ownership |
| `pending_friend_requests` | ✅ Yes | User-scoped, RLS enforces ownership |
| `in_app_notifications` | ✅ Yes | User-scoped, RLS enforces ownership |

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Security Advisor:** Re-run → all 10 `security_definer_view` warnings should be resolved
2. **View property check:**
   ```sql
   SELECT viewname,
     (SELECT option_value FROM pg_options_to_table(reloptions) WHERE option_name = 'security_invoker') as security_invoker
   FROM pg_views v
   JOIN pg_class c ON c.relname = v.viewname
   WHERE schemaname = 'public'
     AND viewname IN ('business_followers_readable', 'businesses_readable',
       'user_friends', 'sharing_analytics', 'conversation_list',
       'unread_notifications', 'business_reviews_with_details',
       'user_review_activity', 'pending_friend_requests', 'in_app_notifications');
   ```
   Expected: `security_invoker = on` for all views

### Functional Tests

3. **Conversation list:** Log in as user → query `conversation_list` → only see own conversations
4. **Friend requests:** Query `pending_friend_requests` → only see requests to/from current user
5. **Notifications:** Query `unread_notifications` → only see own notifications
6. **Business reviews:** Query `business_reviews_with_details` → public reviews visible, user data scoped correctly
7. **User friends:** Query `user_friends` → only see own friendships

---

## ✅ Acceptance Criteria

- [ ] All 10 views have `security_invoker = on`
- [ ] Supabase Security Advisor reports 0 `security_definer_view` warnings
- [ ] Each view still returns correct data for authorized users
- [ ] No unauthorized data leakage through views
- [ ] Decision log documenting each view's conversion status is maintained
- [ ] Application features that use these views work correctly

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration | NEW — `ALTER VIEW ... SET (security_invoker = on)` for all 10 views |

---

## ⚠️ Rollback

Revert to `SECURITY DEFINER` for any views that cause issues:

```sql
ALTER VIEW public.view_name SET (security_invoker = off);
```
