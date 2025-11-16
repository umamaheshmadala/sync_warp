# 🔄 STORY 9.2.7: Contact Sync Enhancements

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.7  
**Priority:** 🟡 Medium  
**Estimate:** 2 days  
**Status:** 📋 Ready for Development  
**Dependencies:** Story 9.2.3 (Contact Sync Integration)

---

## 📋 **Story Description**

As a SynC user, I want **enhanced contact sync features** including Settings UI controls, automatic background sync, and analytics tracking, so I can manage my contact sync preferences and the app can continuously discover new friends.

**User Value:**  
Users have full control over contact sync through Settings, benefit from automatic friend discovery without manual re-sync, and the product team can track sync success metrics for optimization.

---

## 🎯 **Acceptance Criteria**

### Settings UI Integration
- [ ] **AC 9.2.7.1**: Settings page has "Contact Sync" section
- [ ] **AC 9.2.7.2**: Toggle switch to enable/disable contact sync
- [ ] **AC 9.2.7.3**: Display last sync time (e.g., "Last synced 2 hours ago")
- [ ] **AC 9.2.7.4**: Display sync status: "Never synced" / "Syncing..." / "X matches found"
- [ ] **AC 9.2.7.5**: "Sync Now" button to manually trigger sync
- [ ] **AC 9.2.7.6**: "Remove Contacts" button to delete all contact data
- [ ] **AC 9.2.7.7**: Privacy explanation text below controls
- [ ] **AC 9.2.7.8**: Confirmation dialog when disabling sync

### Background Sync Scheduler
- [ ] **AC 9.2.7.9**: Background sync runs every 24 hours when app is active
- [ ] **AC 9.2.7.10**: Only syncs if user has previously given consent
- [ ] **AC 9.2.7.11**: Uses `@capacitor/background-task` or similar for native scheduling
- [ ] **AC 9.2.7.12**: Respects battery saver mode (iOS) and Doze mode (Android)
- [ ] **AC 9.2.7.13**: Silent sync (no UI interruption unless errors occur)
- [ ] **AC 9.2.7.14**: Stores last sync timestamp in database
- [ ] **AC 9.2.7.15**: Exponential backoff on sync failures

### Analytics & Tracking
- [ ] **AC 9.2.7.16**: Track sync events:
  - `contact_sync_started` (timestamp, contacts_count)
  - `contact_sync_completed` (timestamp, matches_found, duration_ms)
  - `contact_sync_failed` (timestamp, error_type)
- [ ] **AC 9.2.7.17**: Track sync success rate (% successful syncs)
- [ ] **AC 9.2.7.18**: Track average match rate (matches found / contacts synced)
- [ ] **AC 9.2.7.19**: Track opt-in rate (% users who enable contact sync)
- [ ] **AC 9.2.7.20**: Create `contact_sync_events` table for analytics
- [ ] **AC 9.2.7.21**: Dashboard query functions for analytics reporting

### Onboarding Integration
- [ ] **AC 9.2.7.22**: Add contact sync prompt to onboarding flow (optional step)
- [ ] **AC 9.2.7.23**: "Skip" button allows users to defer sync
- [ ] **AC 9.2.7.24**: Re-prompt after 7 days if user skipped initially
- [ ] **AC 9.2.7.25**: Track onboarding opt-in vs. settings opt-in separately

---

## 🛠️ **Technical Specification**

### Database Migration: `20250129_contact_sync_enhancements.sql`

```sql
-- Add last_sync_at timestamp to track sync history
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_contact_sync_at TIMESTAMPTZ;

-- Analytics table for contact sync events
CREATE TABLE IF NOT EXISTS contact_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'completed', 'failed')),
  contacts_count INT,
  matches_found INT,
  duration_ms INT,
  error_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_sync_events_user ON contact_sync_events(user_id);
CREATE INDEX idx_contact_sync_events_type ON contact_sync_events(event_type);
CREATE INDEX idx_contact_sync_events_created ON contact_sync_events(created_at DESC);

-- RLS policies
ALTER TABLE contact_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync events"
  ON contact_sync_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync events"
  ON contact_sync_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to log sync event
CREATE OR REPLACE FUNCTION log_contact_sync_event(
  p_event_type TEXT,
  p_contacts_count INT DEFAULT NULL,
  p_matches_found INT DEFAULT NULL,
  p_duration_ms INT DEFAULT NULL,
  p_error_type TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO contact_sync_events (
    user_id,
    event_type,
    contacts_count,
    matches_found,
    duration_ms,
    error_type
  )
  VALUES (
    auth.uid(),
    p_event_type,
    p_contacts_count,
    p_matches_found,
    p_duration_ms,
    p_error_type
  );

  -- Update last sync timestamp on profile
  IF p_event_type = 'completed' THEN
    UPDATE profiles
    SET last_contact_sync_at = NOW()
    WHERE id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Analytics query: Get sync success rate
CREATE OR REPLACE FUNCTION get_sync_success_rate(
  p_user_id UUID DEFAULT NULL,
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  total_syncs BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT,
  success_rate FLOAT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE event_type = 'completed') as successful_syncs,
    COUNT(*) FILTER (WHERE event_type = 'failed') as failed_syncs,
    (COUNT(*) FILTER (WHERE event_type = 'completed')::FLOAT / NULLIF(COUNT(*), 0) * 100) as success_rate
  FROM contact_sync_events
  WHERE 
    (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Analytics query: Get average match rate
CREATE OR REPLACE FUNCTION get_average_match_rate(
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  avg_contacts FLOAT,
  avg_matches FLOAT,
  avg_match_rate FLOAT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(contacts_count)::FLOAT as avg_contacts,
    AVG(matches_found)::FLOAT as avg_matches,
    (AVG(matches_found)::FLOAT / NULLIF(AVG(contacts_count), 0) * 100) as avg_match_rate
  FROM contact_sync_events
  WHERE 
    event_type = 'completed'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

### Service Layer: Update `src/services/contactSyncService.ts`

```typescript
/**
 * Enhanced Contact Sync Service
 * Story 9.2.7: Contact Sync Enhancements
 */

/**
 * Log sync event for analytics
 */
async function logSyncEvent(
  eventType: 'started' | 'completed' | 'failed',
  data?: {
    contactsCount?: number;
    matchesFound?: number;
    durationMs?: number;
    errorType?: string;
  }
): Promise<void> {
  const { error } = await supabase.rpc('log_contact_sync_event', {
    p_event_type: eventType,
    p_contacts_count: data?.contactsCount || null,
    p_matches_found: data?.matchesFound || null,
    p_duration_ms: data?.durationMs || null,
    p_error_type: data?.errorType || null,
  });

  if (error) {
    console.error('Failed to log sync event:', error);
  }
}

/**
 * Enhanced syncContacts with analytics
 */
export async function syncContacts(
  onProgress?: (progress: SyncProgress) => void
): Promise<ContactMatch[]> {
  const startTime = Date.now();
  
  try {
    // Log sync started
    await logSyncEvent('started');
    
    // ... existing sync logic ...
    
    const matches = /* sync result */;
    const duration = Date.now() - startTime;
    
    // Log sync completed
    await logSyncEvent('completed', {
      contactsCount: contacts.length,
      matchesFound: matches.length,
      durationMs: duration,
    });
    
    return matches;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log sync failed
    await logSyncEvent('failed', {
      durationMs: duration,
      errorType: error.message || 'unknown_error',
    });
    
    throw error;
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('last_contact_sync_at')
    .eq('id', user.id)
    .single();

  if (error || !data?.last_contact_sync_at) return null;
  
  return new Date(data.last_contact_sync_at);
}

/**
 * Schedule background sync (every 24 hours)
 */
export function scheduleBackgroundSync(): void {
  // Check if already synced today
  getLastSyncTime().then(lastSync => {
    if (!lastSync) return;
    
    const hoursSinceLastSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastSync >= 24) {
      // Silently sync in background
      syncContacts().catch(err => {
        console.error('Background sync failed:', err);
      });
    }
  });
}
```

### Settings Component: `src/components/settings/ContactSyncSettings.tsx`

```typescript
/**
 * Contact Sync Settings Component
 * Story 9.2.7: Settings UI for Contact Sync
 */

import React, { useState } from 'react';
import { Smartphone, RefreshCw, Trash2, Shield } from 'lucide-react';
import { 
  useHasContactsSynced, 
  useSyncContacts, 
  useDisableContactSync 
} from '@/hooks/useContactSync';
import { getLastSyncTime } from '@/services/contactSyncService';
import { Capacitor } from '@capacitor/core';
import { formatDistanceToNow } from 'date-fns';

export function ContactSyncSettings() {
  const { data: hasSynced } = useHasContactsSynced();
  const syncContacts = useSyncContacts();
  const disableSync = useDisableContactSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Load last sync time
  React.useEffect(() => {
    getLastSyncTime().then(setLastSync);
  }, [syncContacts.isSuccess]);

  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Contact sync is only available on iOS and Android apps.
        </p>
      </div>
    );
  }

  const handleSyncNow = async () => {
    try {
      const matches = await syncContacts.mutateAsync();
      alert(`Found ${matches.length} friends from your contacts!`);
    } catch (error: any) {
      alert(error.message || 'Failed to sync contacts');
    }
  };

  const handleDisableSync = async () => {
    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      await disableSync.mutateAsync();
      setShowConfirmDelete(false);
      setLastSync(null);
      alert('Contact sync disabled. All contact data has been removed.');
    } catch (error: any) {
      alert(error.message || 'Failed to disable sync');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Contact Sync</h3>
        </div>
      </div>

      {/* Status */}
      <div className="p-4 bg-gray-50 rounded-lg">
        {!hasSynced && (
          <p className="text-sm text-gray-600">
            Never synced
          </p>
        )}
        {hasSynced && lastSync && (
          <p className="text-sm text-gray-600">
            Last synced {formatDistanceToNow(lastSync, { addSuffix: true })}
          </p>
        )}
        {syncContacts.isPending && (
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-sm text-blue-600">Syncing...</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleSyncNow}
          disabled={syncContacts.isPending}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncContacts.isPending ? 'animate-spin' : ''}`} />
          <span>{syncContacts.isPending ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {hasSynced && (
          <button
            onClick={handleDisableSync}
            disabled={disableSync.isPending}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showConfirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {showConfirmDelete ? 'Confirm: Remove All Contacts' : 'Remove Contacts'}
            </span>
          </button>
        )}

        {showConfirmDelete && (
          <button
            onClick={() => setShowConfirmDelete(false)}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Privacy info */}
      <div className="p-4 bg-blue-50 rounded-lg flex items-start space-x-2">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Your privacy is protected</p>
          <p>
            Phone numbers are hashed before upload. We never store plain phone numbers.
            You can remove all contact data anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Onboarding Integration: `src/components/onboarding/ContactSyncStep.tsx`

```typescript
/**
 * Contact Sync Onboarding Step
 * Story 9.2.7: Onboarding integration
 */

import React from 'react';
import { Users, ArrowRight, X } from 'lucide-react';
import { ContactSyncModal } from '@/components/contacts/ContactSyncModal';

interface ContactSyncStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ContactSyncStep({ onComplete, onSkip }: ContactSyncStepProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSyncComplete = () => {
    setShowModal(false);
    onComplete();
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <Users className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Find Friends from Contacts
        </h2>
        <p className="text-gray-600">
          Discover which of your contacts are already on SynC and connect instantly
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <span>Sync Contacts</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSkip}
          className="w-full px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          Skip for now
        </button>
      </div>

      <ContactSyncModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          onSkip(); // Treat close as skip
        }}
      />
    </div>
  );
}
```

---

## 🎯 **MCP Integration**

### Supabase MCP
```bash
# Apply enhancement migration
warp mcp run supabase "apply_migration mobile-app-setup 20250129_contact_sync_enhancements ..."

# Test analytics functions
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM get_sync_success_rate()"
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM get_average_match_rate()"
```

---

## ✅ **Definition of Done**

- [ ] All 25 acceptance criteria met
- [ ] Settings UI implemented and accessible
- [ ] Background sync scheduler working
- [ ] Analytics tracking implemented
- [ ] Onboarding step created
- [ ] Database migration applied
- [ ] Manual testing completed
- [ ] Code committed and pushed

---

**Next Story:** [STORY 9.2.4 - Search Filters & Advanced Search](./STORY_9.2.4_Search_Filters_Advanced.md)
