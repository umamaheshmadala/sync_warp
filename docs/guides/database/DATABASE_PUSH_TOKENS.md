# Push Tokens Database Table 📊

## Overview

The `push_tokens` table stores device push notification tokens for iOS, Android, and Web platforms.

---

## Schema

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);
```

---

## Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to `auth.users` |
| `token` | TEXT | Push notification token (FCM/APNs) |
| `platform` | TEXT | Device platform: `ios`, `android`, or `web` |
| `created_at` | TIMESTAMPTZ | When token was first registered |
| `updated_at` | TIMESTAMPTZ | Last update time (auto-updated) |
| `last_used_at` | TIMESTAMPTZ | Last time token was used for push |

---

## Constraints

- **Primary Key**: `id`
- **Foreign Key**: `user_id` → `auth.users(id)` with `ON DELETE CASCADE`
- **Check**: `platform` must be `'ios'`, `'android'`, or `'web'`
- **Unique**: `(user_id, platform)` - one token per platform per user

---

## Indexes

- `idx_push_tokens_user_id` - Query by user
- `idx_push_tokens_token` - Lookup specific token
- `idx_push_tokens_platform` - Filter by platform
- `idx_push_tokens_user_platform` - Composite index

---

## Row Level Security (RLS)

All policies require users to be authenticated (`auth.uid()` must match `user_id`):

- **SELECT**: Users can only view their own tokens
- **INSERT**: Users can only insert tokens for themselves
- **UPDATE**: Users can only update their own tokens
- **DELETE**: Users can only delete their own tokens

---

## Usage Examples

### Insert/Upsert Token
```typescript
// Insert or update token for current user
const { error } = await supabase
  .from('push_tokens')
  .upsert({
    user_id: user.id,
    token: 'fcm_token_here',
    platform: 'android'
  }, {
    onConflict: 'user_id,platform'
  });
```

### Get User's Tokens
```typescript
// Get all tokens for current user
const { data, error } = await supabase
  .from('push_tokens')
  .select('*')
  .eq('user_id', user.id);
```

### Delete Token
```typescript
// Delete specific token
const { error } = await supabase
  .from('push_tokens')
  .delete()
  .eq('token', tokenToDelete);
```

### Get Tokens by Platform
```typescript
// Get all iOS tokens for user
const { data, error } = await supabase
  .from('push_tokens')
  .select('*')
  .eq('user_id', user.id)
  .eq('platform', 'ios');
```

---

## Backend Usage

Send notification to all user devices:

```typescript
// Get all tokens for user
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .eq('user_id', userId);

// Send to each device
for (const tokenData of tokens) {
  if (tokenData.platform === 'android' || tokenData.platform === 'web') {
    await sendFCMNotification(tokenData.token, message);
  } else if (tokenData.platform === 'ios') {
    await sendAPNsNotification(tokenData.token, message);
  }
  
  // Update last_used_at
  await supabase
    .from('push_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', tokenData.token);
}
```

---

## Maintenance

### Clean Up Expired Tokens
```sql
-- Remove tokens not used in 90 days
DELETE FROM push_tokens
WHERE last_used_at < NOW() - INTERVAL '90 days';
```

### Find Users with Multiple Devices
```sql
SELECT 
  user_id, 
  COUNT(*) as device_count,
  ARRAY_AGG(platform) as platforms
FROM push_tokens
GROUP BY user_id
HAVING COUNT(*) > 1;
```

---

## Related

- **Story 7.2.3**: Push Token Registration Hook
- **Story 7.2.5**: Integrated Auth Flow (uses this table)
