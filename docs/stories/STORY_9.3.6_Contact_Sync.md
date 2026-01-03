
## 📝 **Story Description**

As a **mobile user**, I want to **sync my phone contacts to find friends** so that I can **easily connect with people I already know**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Explainer modal: "Find friends from contacts" with benefits
2. ✅ "Allow Access" button triggers native permission dialog (iOS/Android)
3. ✅ Progress indicator during sync
4. ✅ Success state: "X friends found from contacts"
5. ✅ Permission denied: Show settings link + alternative methods
6. ✅ Skip button: Dismiss and don't ask again
7. ✅ Only show on mobile platforms
8. ✅ Respect user choice (localStorage flag)

---

## 📦 **Implementation**

```typescript
export function ContactSyncModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const { requestContactsPermission, syncContacts } = useContactSync();

  useEffect(() => {
    // Only show on mobile and if not previously dismissed
    const shouldShow = isMobile && !localStorage.getItem('contact_sync_dismissed');
    setIsOpen(shouldShow);
  }, []);

  const handleAllowAccess = async () => {
    setIsSyncing(true);
    const granted = await requestContactsPermission();
    
    if (granted) {
      const result = await syncContacts();
      setSyncResult(result);
    } else {
      // Show permission denied state
      setSyncResult({ granted: false, friendsFound: 0 });
    }
    setIsSyncing(false);
  };

  const handleSkip = () => {
    localStorage.setItem('contact_sync_dismissed', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {!syncResult ? (
          <>
            {/* Explainer */}
            <div className="text-center">
              <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Find Friends from Contacts</h2>
              <p className="text-gray-600 mb-6">
                We'll match your contacts with SynC users so you can easily connect with people you know.
              </p>
            </div>

            {/* Benefits */}
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Instantly find friends already on SynC</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Your contacts stay private and secure</span>
              </li>
            </ul>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAllowAccess}
                disabled={isSyncing}
                className="py-3 bg-blue-600 text-white rounded-lg font-semibold"
              >
                {isSyncing ? 'Syncing...' : 'Allow Access'}
              </button>
              <button
                onClick={handleSkip}
                className="py-3 text-gray-600"
              >
                Skip for Now
              </button>
            </div>
          </>
        ) : syncResult.granted ? (
          /* Success State */
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {syncResult.friendsFound} Friends Found!
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 py-3 px-6 bg-blue-600 text-white rounded-lg"
            >
              View Friends
            </button>
          </div>
        ) : (
          /* Permission Denied */
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Permission Denied</h2>
            <p className="text-gray-600 mb-4">
              To sync contacts, please enable permissions in your device settings.
            </p>
            <button
              onClick={openAppSettings}
              className="py-3 px-6 bg-blue-600 text-white rounded-lg"
            >
              Open Settings
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## ✅ **Implementation Details**

### Frontend Components
- **`src/components/contacts/ContactSyncModal.tsx`** - Main modal component with explainer, progress, and results
- **`src/pages/ContactSyncTestPage.tsx`** - Test page for contact sync functionality
- **`src/services/contactSyncService.ts`** - Contact sync logic with hashing and deduplication
- **`src/hooks/useContactSync.ts`** - React hooks for contact sync state management
- **`src/utils/platformUtils.ts`** - Platform detection utilities

### Database Schema
- **`supabase/migrations/20250201_create_contact_sync.sql`** - Initial schema for contact_hashes and contact_matches tables
- **`supabase/migrations/20250201_fix_match_contacts_optimized.sql`** - Optimized match_contacts RPC function

### Key Features Implemented
1. ✅ Privacy-focused hashing (SHA-256) of phone numbers
2. ✅ Automatic deduplication to prevent SQL conflicts
3. ✅ Optimized database queries with proper indexing
4. ✅ Real-time progress tracking during sync
5. ✅ Friend exclusion logic (no duplicate friend suggestions)
6. ✅ Native permission handling for iOS/Android
7. ✅ Graceful error handling with detailed logging

### Fixes Applied
- Fixed `useAuthStore` bundling error (Vite config)
- Fixed SQL conflict errors (Set-based deduplication)
- Fixed database function timeout (optimized queries)
- Fixed column reference errors (email as username)
- Enabled DevMenu on native platforms for testing

---

## 🧪 **Testing**

- [x] Modal appears only on mobile
- [x] Permission dialog triggered correctly
- [x] Sync completes and shows result
- [x] Skip stores dismissal flag
- [x] Settings link works on permission denial

---

**Next Story:** [STORY 9.3.7: Online Status & Badges](./STORY_9.3.7_Status_Badges.md)
