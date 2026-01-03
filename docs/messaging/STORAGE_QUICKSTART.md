# Message Attachments Storage - Quick Start Guide

This guide walks you through testing the STORY 8.1.3 implementation you just completed.

---

## What You Have Now

✅ **Backend (Supabase)**:
- `message-attachments` bucket (private, 25MB limit, image/video only)
- RLS policies on `storage.objects` (upload/view/delete)
- Migration: `supabase/migrations/20250203_create_message_attachments_bucket.sql`

✅ **Frontend Code**:
- Service: `src/services/messageStorageService.ts`
- Test page: `src/pages/test/StorageTest.tsx`

✅ **Documentation**:
- Structure: `docs/messaging/STORAGE_STRUCTURE.md`
- RLS policies: `docs/messaging/RLS_POLICIES.md`
- Testing guide: `docs/testing/STORY_8.1.3_MANUAL_TESTING_GUIDE.md`

---

## Step 1: Add Test Route

Add the storage test page to your router so you can access it at `/test/storage`.

**If using React Router** (`src/router/index.tsx` or similar):

```tsx
import StorageTest from '../pages/test/StorageTest';

// Add to your routes:
{
  path: '/test/storage',
  element: <StorageTest />
}
```

---

## Step 2: Run Your Dev Server

```bash
npm run dev
# or
yarn dev
```

Navigate to: `http://localhost:5173/test/storage` (or your dev server URL)

---

## Step 3: Test Upload & Check for CORS

1. **Log in** as any test user.
2. **Open browser DevTools**:
   - Console tab (for errors)
   - Network tab (to watch Storage requests)
3. **Select a small image** (< 5MB) via the file input.
4. Click **"Upload"**.

### What to watch:

- ✅ **If upload succeeds** without CORS errors in console:
  - Supabase's default CORS is sufficient for your setup.
  - You're done with CORS! 🎉
  
- ❌ **If you see** `No 'Access-Control-Allow-Origin' header is present on the requested resource`:
  - Your origin (e.g., `http://localhost:5173`) is being blocked.
  - Proceed to Step 4 (proxy setup).

---

## Step 4: (Optional) Set Up Proxy for CORS

**Only do this if Step 3 showed CORS errors.**

### Option A: Next.js API Route (if you're using Next.js)

Create `pages/api/storage/upload.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or specific domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read file from request body, upload to Supabase Storage
  // Return result
}
```

Then update `messageStorageService.ts` to call `/api/storage/upload` instead of directly calling Supabase.

### Option B: Vite/React Dev Server Proxy

Edit `vite.config.ts`:

```ts
export default defineConfig({
  server: {
    proxy: {
      '/storage-proxy': {
        target: 'https://YOUR_PROJECT_REF.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage-proxy/, '/storage/v1')
      }
    }
  }
});
```

This only works in dev; for production you'd need a real backend.

---

## Step 5: Test Signed URLs

1. After a successful upload, click **"Generate Signed URL"**.
2. The image/video should appear in the preview section.
3. Check the Network tab: the signed URL request should succeed.
4. Copy the signed URL and try opening it in a new tab or 1 hour later (it should expire).

---

## Step 6: Test Delete

1. Click **"Delete"** button.
2. Confirm the deletion.
3. The file should be removed from Supabase Storage (verify in Dashboard → Storage → message-attachments if needed).

---

## Step 7: Test on Mobile (Optional but Recommended)

### iOS (Capacitor)

1. Build the iOS app: `npx cap sync ios && npx cap open ios`
2. Run the app on a simulator or device.
3. Navigate to the `/test/storage` page in the app.
4. Select an image from Camera or Photo Library.
5. Upload and verify it works.

**Note**: Capacitor's origin is `capacitor://localhost`. If you see CORS issues, you'll need the proxy approach from Step 4.

### Android (Capacitor)

Same as iOS, but origin is `http://localhost`.

```bash
npx cap sync android && npx cap open android
```

---

## Step 8: Verify RLS (Security)

To confirm RLS is working:

1. Log in as **User A**, upload a file.
2. Note the file path (e.g., `user-a-id/conv-id/123-photo.jpg`).
3. Log out and log in as **User B**.
4. Try to manually access User A's file by constructing a signed URL request for User A's path.
5. Expected: **403 Forbidden** or similar access denied error (RLS blocks it).

---

## Summary Checklist

- [ ] Test page accessible at `/test/storage`
- [ ] Upload succeeds without CORS errors (or proxy implemented if needed)
- [ ] Signed URL generation works
- [ ] File preview loads correctly
- [ ] Delete operation works
- [ ] Size limit enforced (try uploading 26MB+ file)
- [ ] MIME type restriction enforced (try uploading .zip)
- [ ] RLS prevents cross-user access
- [ ] Mobile (iOS/Android) upload works (if applicable)

Once all items are checked, **STORY 8.1.3 is fully verified end-to-end** for your environment.

---

## Troubleshooting

### "User not authenticated" error
- Make sure you're logged in before testing upload.
- Check `supabase.auth.getUser()` returns a valid user.

### "Bucket not found" error
- Verify the migration was applied: check Supabase Dashboard → Storage.
- Confirm bucket ID is exactly `message-attachments`.

### Upload succeeds but file not visible in Dashboard
- Check the path structure: `{user_id}/{conversation_id}/{timestamp}-{filename}`.
- Navigate to the correct folder in Dashboard.

### Signed URL returns 403
- Ensure RLS policies on `storage.objects` are correctly applied.
- Check that the file is referenced in a `messages.media_urls` or `thumbnail_url` row for a conversation you're in.

---

For more details, see:
- `docs/messaging/STORAGE_STRUCTURE.md`
- `docs/testing/STORY_8.1.3_MANUAL_TESTING_GUIDE.md`
