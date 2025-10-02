# Story 5.5: Enhanced Sharing Limits - Quick Reference

**Status**: ✅ COMPLETE | **Date**: October 2, 2025

---

## 🚀 **Quick Start**

### **1. Verify Deployment**
```sql
-- In Supabase SQL Editor
SELECT * FROM sharing_limits_config;
```
**Should return**: 4 rows (regular + driver limits)

---

### **2. Test Basic Share**
```typescript
// In your React component
import { useSharingLimits } from '@/hooks/useSharingLimits';

const { stats, checkPermission, logShare } = useSharingLimits();

// Before sharing
const permission = await checkPermission(friendId);
if (!permission.can_share) {
  // Show limit exceeded modal
  return;
}

// After sharing
await logShare(friendId, couponId);
```

---

### **3. Display Stats**
```tsx
import { SharingStatsCard } from '@/components/Sharing/SharingStatsCard';

<SharingStatsCard 
  stats={stats} 
  compact={true} // For inline display
/>
```

---

## 📊 **Limits at a Glance**

| Limit Type | Regular | Driver |
|------------|---------|--------|
| Per Friend/Day | 3 | 5 |
| Total/Day | 20 | 30 |

---

## 🗂️ **File Locations**

### **Core Files**
```
✅ Migration:     supabase/migrations/20251002000000_create_sharing_limits_system.sql
✅ Types:         src/types/sharingLimits.ts
✅ Service:       src/services/sharingLimitsService.ts
✅ Hook:          src/hooks/useSharingLimits.ts
✅ Stats Card:    src/components/Sharing/SharingStatsCard.tsx
✅ Modal:         src/components/Sharing/LimitExceededModal.tsx
✅ Integration:   src/components/ShareDealSimple.tsx
```

### **Documentation**
```
📘 Deployment:    docs/DEPLOY_STORY_5.5.md
🧪 Testing:       docs/TESTING_STORY_5.5.md
📄 Summary:       docs/STORY_5.5_SUMMARY.md
⚡ Quick Ref:     docs/STORY_5.5_QUICKREF.md (this file)
```

---

## 🔧 **Common Tasks**

### **Check User's Current Stats**
```sql
SELECT get_sharing_stats_today('USER-ID'::UUID);
```

### **Check If User Can Share**
```sql
SELECT can_share_to_friend(
  'SENDER-ID'::UUID,
  'RECIPIENT-ID'::UUID,
  false  -- is_driver
);
```

### **View Today's Sharing Logs**
```sql
SELECT * FROM coupon_sharing_log
WHERE sender_id = 'USER-ID'
  AND sharing_day = CURRENT_DATE;
```

### **Change Limits (Admin Only)**
```sql
UPDATE sharing_limits_config
SET limit_value = 5
WHERE limit_type = 'per_friend_daily';
```

---

## 🐛 **Troubleshooting**

### **Stats Not Loading**
- ✅ Check Supabase connection
- ✅ Verify user is authenticated
- ✅ Check browser console for errors

### **Limits Not Enforced**
- ✅ Verify migration deployed
- ✅ Check `checkPermission()` is called
- ✅ Ensure `logShare()` is called after successful share

### **Modal Not Showing**
- ✅ Check `showLimitModal` state
- ✅ Verify `permissionCheck` has data
- ✅ Ensure `can_share: false` in permission result

---

## 📞 **Get Help**

| Issue | Document | Section |
|-------|----------|---------|
| Deployment failed | `DEPLOY_STORY_5.5.md` | Troubleshooting |
| Test failed | `TESTING_STORY_5.5.md` | Test Suites 1-5 |
| Need overview | `STORY_5.5_SUMMARY.md` | Full summary |
| Quick lookup | `STORY_5.5_QUICKREF.md` | This file |

---

## ✅ **Checklist**

**Before Going Live:**
- [ ] Migration deployed successfully
- [ ] All 4 functions exist in database
- [ ] Frontend code deployed
- [ ] Integration tests passed
- [ ] Edge cases tested
- [ ] Error handling verified
- [ ] Driver detection implemented (or stub acknowledged)

**After Going Live:**
- [ ] Monitor Supabase logs
- [ ] Track sharing patterns
- [ ] Gather user feedback
- [ ] Plan Driver detection rollout

---

**Last Updated**: October 2, 2025  
**Status**: Production Ready (pending tests)
