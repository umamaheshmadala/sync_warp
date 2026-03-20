# Story 12.22: Real-Time Like Counter

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Completed  
**Priority**: P1  
**Estimate**: 3 points  
**Depends on**: Nothing — can be built in parallel with 12.20 chain  
**Related**: [Story 12.5 — Likes System](STORY_12.5_Likes_System.md) (existing likes foundation)

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **This story has no upstream story dependencies.** It can be built in parallel with the 12.20 chain.
> However, Story 12.19 (Action Bar Redesign) depends on THIS story being complete before wiring starts.
> This story modifies `useProductLike.ts` which is also used by Story 12.19 — coordinate to avoid merge conflicts.

| Check | How to Verify | Expected Result |
|-------|-------------|----------------|
| `product_likes` table exists | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM product_likes")` | Table exists (count ≥ 0) |
| Realtime enabled on project | Supabase Dashboard → Project Settings → Replication | Realtime is enabled |
| `product_likes` in Realtime publication | `mcp_supabase-mcp-server_execute_sql("SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='product_likes'")` | Row returned; if empty, must add the table to the publication |
| DB trigger status (determines subscription approach) | `mcp_supabase-mcp-server_execute_sql("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='product_likes'")` | If trigger exists → use Option A; if not → use Option B (see Technical Specs) |
| `useProductLike.ts` current state | Read `src/hooks/useProductLike.ts` | No existing Realtime subscription (clean starting point) |

---

## User Story

**As a** user viewing a product  
**I want** the like count to update in real-time  
**So that** I see the latest number without having to close and reopen the product modal

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Read `src/hooks/useProductLike.ts` (fully) — understand current state management and `likeCount` source
> 2. Read `src/services/productLikeService.ts` — confirm use of `product_likes` table
> 3. Run `mcp_supabase-mcp-server_execute_sql("SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'product_likes'")` → check if a DB trigger keeps `products.like_count` in sync (this determines the Realtime subscription approach)
> 4. Run `mcp_supabase-mcp-server_execute_sql("SELECT pubname, tablename FROM pg_publication_tables WHERE tablename IN ('product_likes', 'products')")` → confirm which tables are in the Realtime publication
> 5. Check `src/lib/supabase.ts` — understand how the supabase client is imported

No new DB tables needed. This story only modifies an existing hook.

---

## Scope

### In Scope
- Add Supabase Realtime subscription inside `useProductLike` hook
- Like count updates immediately for ALL users viewing the same product (not just the one who tapped)
- Cleanup: unsubscribe on component unmount (no memory leaks)
- Optimistic update from existing code continues to work correctly — no double-increment

### Out of Scope
- Real-time comment count (separate story if needed)
- Real-time favourite count

---

## Technical Specifications

### Determining the Subscription Approach

**First** run the pre-implementation Supabase MCP checks above, then choose:

**Option A — Subscribe to `products` table** (if a DB trigger keeps `products.like_count` in sync):
```typescript
supabase.channel(`product-${productId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'products',
    filter: `id=eq.${productId}`
  }, (payload) => {
    setLikeCount(payload.new.like_count);
  })
  .subscribe();
```

**Option B — Subscribe to `product_likes` table** (if no trigger — count manually):
```typescript
supabase.channel(`product-likes-${productId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'product_likes',
    filter: `product_id=eq.${productId}`
  }, (payload) => {
    if (payload.eventType === 'INSERT') setLikeCount(c => c + 1);
    if (payload.eventType === 'DELETE') setLikeCount(c => Math.max(0, c - 1));
  })
  .subscribe();
```

> **Choose Option A if the trigger exists** — it's more accurate and avoids edge cases where other users' likes within the same second cause double-counting with Option B.  
> **Choose Option B only if the trigger does not exist or `product_likes` is not in the publication.**

### Channel Cleanup Pattern
```typescript
return () => {
  supabase.removeChannel(channel);
};
```
This goes in the `useEffect` cleanup to prevent memory leaks when the product modal closes.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useProductLike.ts` | Add `useEffect` with Supabase Realtime channel subscription and cleanup |

---

## Acceptance Criteria

- [ ] Device A and Device B both have the same product modal open
- [ ] Device A taps Like → Device B's like count updates within ~1–2 seconds (no refresh)
- [ ] Device A taps Unlike → Device B's count decrements correctly
- [ ] Own optimistic update (the toggling user) is not double-incremented by the Realtime event
- [ ] Channel is removed on product modal close (verify via Supabase Dashboard → Realtime)
- [ ] No console errors on subscription or unsubscription

---

## Dependencies

- [Story 12.5](STORY_12.5_Likes_System.md) — existing `product_likes` table and `useProductLike` hook foundation
