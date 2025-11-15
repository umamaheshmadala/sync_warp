# 📱 STORY 9.2.3: Contact Sync Integration (iOS/Android)

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.3  
**Priority:** 🔴 Critical  
**Estimate:** 5 days  
**Status:** 📋 Ready for Development  
**Dependencies:** Story 9.2.2 (PYMK Engine)

---

## 📋 **Story Description**

As a SynC mobile user, I want to **sync my phone contacts** to discover which of my contacts are already on SynC, so I can easily connect with people I know without manual searching.

**User Value:**  
Users can quickly grow their network by finding friends from their existing contacts, with privacy-preserving technology (hashed phone numbers) ensuring security.

---

## 🎯 **Acceptance Criteria**

### Database Layer
- [ ] **AC 9.2.3.1**: `contact_hashes` table created to store SHA-256 hashed phone numbers
- [ ] **AC 9.2.3.2**: RLS policies ensure users only see their own contact hashes
- [ ] **AC 9.2.3.3**: `match_contacts()` function matches hashed numbers with existing users
- [ ] **AC 9.2.3.4**: `upsert_contact_hashes()` function to add/update user's contact hashes
- [ ] **AC 9.2.3.5**: Index on `phone_hash` column for fast lookup

### Mobile Integration (Capacitor)
- [ ] **AC 9.2.3.6**: Capacitor Contacts plugin installed and configured
- [ ] **AC 9.2.3.7**: iOS Contacts API integration via Capacitor
- [ ] **AC 9.2.3.8**: Android Contacts API integration via Capacitor
- [ ] **AC 9.2.3.9**: Permission request with clear explanation modal
- [ ] **AC 9.2.3.10**: Handle permission denied gracefully (skip sync)

### Privacy & Security
- [ ] **AC 9.2.3.11**: Phone numbers hashed with SHA-256 before upload
- [ ] **AC 9.2.3.12**: Phone numbers normalized before hashing (remove spaces, dashes, etc.)
- [ ] **AC 9.2.3.13**: Plain phone numbers NEVER sent to server or stored in database
- [ ] **AC 9.2.3.14**: User consent checkbox: "I agree to sync my contacts"
- [ ] **AC 9.2.3.15**: Option to disable contact sync in settings

### Service Layer
- [ ] **AC 9.2.3.16**: `contactSyncService.ts` created with:
  - `requestPermission()` - Request contacts permission
  - `syncContacts()` - Read, hash, and upload contacts
  - `getContactMatches()` - Get matched SynC users
  - `disableContactSync()` - Remove contact hashes
- [ ] **AC 9.2.3.17**: Background sync scheduled every 24 hours (when app active)
- [ ] **AC 9.2.3.18**: Sync progress tracking (e.g., "Syncing 150 contacts...")

### Frontend Hooks & UI
- [ ] **AC 9.2.3.19**: `useContactSync.ts` hook with permission, sync, matches queries
- [ ] **AC 9.2.3.20**: `ContactSyncModal.tsx` - Explainer modal with consent
- [ ] **AC 9.2.3.21**: `ContactMatchesList.tsx` - Display matched contacts
- [ ] **AC 9.2.3.22**: `ContactSyncButton.tsx` - Trigger sync from settings
- [ ] **AC 9.2.3.23**: Display "X friends found" success message
- [ ] **AC 9.2.3.24**: Contact matches appear in PYMK with "From contacts" badge

### Testing
- [ ] **AC 9.2.3.25**: Unit tests for phone number normalization and hashing
- [ ] **AC 9.2.3.26**: E2E test (iOS): Request permission → sync contacts → see matches
- [ ] **AC 9.2.3.27**: E2E test (Android): Same flow
- [ ] **AC 9.2.3.28**: Test permission denied flow (graceful skip)
- [ ] **AC 9.2.3.29**: Security test: Verify no plain phone numbers in network requests

---

## 🛠️ **Technical Specification**

### Database Migration: `20250127_contact_sync.sql`

```sql
-- Contact hashes table for privacy-preserving contact matching
CREATE TABLE IF NOT EXISTS contact_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_phone_hash UNIQUE(user_id, phone_hash)
);

CREATE INDEX idx_contact_hashes_user ON contact_hashes(user_id);
CREATE INDEX idx_contact_hashes_phone ON contact_hashes(phone_hash);

-- RLS policies
ALTER TABLE contact_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact hashes"
  ON contact_hashes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contact hashes"
  ON contact_hashes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact hashes"
  ON contact_hashes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact hashes"
  ON contact_hashes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_contact_hashes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_hashes_updated_at
  BEFORE UPDATE ON contact_hashes
  FOR EACH ROW EXECUTE FUNCTION update_contact_hashes_updated_at();

-- Function to upsert contact hashes (bulk insert)
CREATE OR REPLACE FUNCTION upsert_contact_hashes(
  p_user_id UUID,
  p_phone_hashes TEXT[]
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Delete old hashes not in the new list
  DELETE FROM contact_hashes
  WHERE user_id = p_user_id
    AND phone_hash NOT IN (SELECT unnest(p_phone_hashes));

  -- Insert new hashes
  INSERT INTO contact_hashes (user_id, phone_hash)
  SELECT p_user_id, unnest(p_phone_hashes)
  ON CONFLICT (user_id, phone_hash) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to match contacts (find SynC users)
CREATE OR REPLACE FUNCTION match_contacts(
  p_user_id UUID,
  p_phone_hashes TEXT[]
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  phone_hash TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    ch.phone_hash
  FROM profiles p
  JOIN contact_hashes ch ON ch.user_id = p.id
  WHERE ch.phone_hash = ANY(p_phone_hashes)
    AND p.id != p_user_id
    -- Exclude blocked users
    AND p.id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = p_user_id
      UNION
      SELECT blocker_id FROM blocked_users WHERE blocked_id = p_user_id
    )
    -- Exclude existing friends
    AND p.id NOT IN (
      SELECT friend_id FROM friendships WHERE user_id = p_user_id AND is_active = true
    )
    -- Only searchable profiles
    AND p.is_searchable = true;
END;
$$ LANGUAGE plpgsql;

-- Update contact_matches table (used by PYMK)
-- Insert matched users into contact_matches for PYMK integration
CREATE OR REPLACE FUNCTION update_contact_matches(
  p_user_id UUID,
  p_matched_user_ids UUID[]
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old matches not in the new list
  DELETE FROM contact_matches
  WHERE user_id = p_user_id
    AND matched_user_id NOT IN (SELECT unnest(p_matched_user_ids));

  -- Insert new matches
  INSERT INTO contact_matches (user_id, matched_user_id)
  SELECT p_user_id, unnest(p_matched_user_ids)
  ON CONFLICT (user_id, matched_user_id) DO UPDATE
    SET matched_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Service Layer: `src/services/contactSyncService.ts`

```typescript
/**
 * Contact Sync Service - iOS/Android Contact Matching
 * Story 9.2.3: Contact Sync Integration
 */

import { Contacts, Contact } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export interface ContactMatch {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  phone_hash: string;
}

export interface SyncProgress {
  total: number;
  synced: number;
  matches: number;
}

/**
 * Check if contacts permission is granted
 */
export async function hasContactsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false; // Web doesn't support contacts
  }

  const permission = await Contacts.checkPermissions();
  return permission.contacts === 'granted';
}

/**
 * Request contacts permission
 */
export async function requestContactsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Contacts sync is only available on mobile devices');
  }

  const permission = await Contacts.requestPermissions();
  return permission.contacts === 'granted';
}

/**
 * Normalize phone number (remove spaces, dashes, parentheses, etc.)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // For US numbers, keep last 10 digits if longer
  if (digits.length > 10 && digits.startsWith('1')) {
    return digits.slice(-10);
  }
  
  return digits;
}

/**
 * Hash phone number with SHA-256
 */
async function hashPhoneNumber(phone: string): Promise<string> {
  const normalized = normalizePhoneNumber(phone);
  
  // Use Web Crypto API (available in Capacitor)
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Sync contacts from device
 */
export async function syncContacts(
  onProgress?: (progress: SyncProgress) => void
): Promise<ContactMatch[]> {
  // Check permission
  const hasPermission = await hasContactsPermission();
  if (!hasPermission) {
    const granted = await requestContactsPermission();
    if (!granted) {
      throw new Error('Contacts permission denied');
    }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Read contacts from device
  const { contacts } = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
    },
  });

  // Extract and hash phone numbers
  const phoneHashes: string[] = [];
  let processed = 0;

  for (const contact of contacts) {
    if (contact.phones && contact.phones.length > 0) {
      for (const phone of contact.phones) {
        if (phone.number) {
          try {
            const hash = await hashPhoneNumber(phone.number);
            phoneHashes.push(hash);
          } catch (error) {
            console.error('Failed to hash phone number:', error);
          }
        }
      }
    }
    
    processed++;
    onProgress?.({ total: contacts.length, synced: processed, matches: 0 });
  }

  // Upload hashed phone numbers to database
  const { error: uploadError } = await supabase.rpc('upsert_contact_hashes', {
    p_user_id: user.id,
    p_phone_hashes: phoneHashes,
  });

  if (uploadError) {
    console.error('Failed to upload contact hashes:', uploadError);
    throw new Error('Failed to sync contacts. Please try again.');
  }

  // Match contacts with existing SynC users
  const { data: matches, error: matchError } = await supabase.rpc('match_contacts', {
    p_user_id: user.id,
    p_phone_hashes: phoneHashes,
  });

  if (matchError) {
    console.error('Failed to match contacts:', matchError);
    throw new Error('Failed to find friends from contacts');
  }

  // Update contact_matches table for PYMK integration
  const matchedUserIds = matches?.map(m => m.user_id) || [];
  if (matchedUserIds.length > 0) {
    await supabase.rpc('update_contact_matches', {
      p_user_id: user.id,
      p_matched_user_ids: matchedUserIds,
    });
  }

  onProgress?.({ 
    total: contacts.length, 
    synced: contacts.length, 
    matches: matches?.length || 0 
  });

  return matches || [];
}

/**
 * Get contact matches (previously synced)
 */
export async function getContactMatches(): Promise<ContactMatch[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('contact_matches')
    .select(`
      matched_user_id,
      profiles:matched_user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to get contact matches:', error);
    return [];
  }

  return data?.map(m => ({
    user_id: m.matched_user_id,
    full_name: m.profiles.full_name,
    username: m.profiles.username,
    avatar_url: m.profiles.avatar_url,
    phone_hash: '',
  })) || [];
}

/**
 * Disable contact sync (delete all contact hashes)
 */
export async function disableContactSync(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Delete contact hashes
  const { error: hashError } = await supabase
    .from('contact_hashes')
    .delete()
    .eq('user_id', user.id);

  if (hashError) {
    console.error('Failed to delete contact hashes:', hashError);
    throw new Error('Failed to disable contact sync');
  }

  // Delete contact matches
  const { error: matchError } = await supabase
    .from('contact_matches')
    .delete()
    .eq('user_id', user.id);

  if (matchError) {
    console.error('Failed to delete contact matches:', matchError);
  }
}

/**
 * Check if user has synced contacts before
 */
export async function hasContactsSynced(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from('contact_hashes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return !error && (count || 0) > 0;
}
```

### React Hook: `src/hooks/useContactSync.ts`

```typescript
/**
 * Contact Sync Hooks
 * Story 9.2.3: Contact Sync Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  hasContactsPermission,
  syncContacts,
  getContactMatches,
  disableContactSync,
  hasContactsSynced,
  type ContactMatch,
  type SyncProgress,
} from '@/services/contactSyncService';

/**
 * Hook to check if contacts permission is granted
 */
export function useContactsPermission() {
  return useQuery({
    queryKey: ['contacts', 'permission'],
    queryFn: hasContactsPermission,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to check if user has synced contacts
 */
export function useHasContactsSynced() {
  return useQuery({
    queryKey: ['contacts', 'has-synced'],
    queryFn: hasContactsSynced,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to sync contacts with progress tracking
 */
export function useSyncContacts() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const mutation = useMutation({
    mutationFn: () => syncContacts(setProgress),
    onSuccess: (matches) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pymk'] });
      
      // Reset progress after success
      setTimeout(() => setProgress(null), 3000);
    },
    onError: () => {
      setProgress(null);
    },
  });

  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook to get contact matches
 */
export function useContactMatches() {
  return useQuery({
    queryKey: ['contacts', 'matches'],
    queryFn: getContactMatches,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to disable contact sync
 */
export function useDisableContactSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableContactSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pymk'] });
    },
  });
}
```

### UI Components

**`src/components/contacts/ContactSyncModal.tsx`**

```typescript
/**
 * Contact Sync Modal - Explainer and Permission Request
 * Story 9.2.3: Contact Sync Integration
 */

import React, { useState } from 'react';
import { X, Users, Shield, Check, Loader2 } from 'lucide-react';
import { useSyncContacts } from '@/hooks/useContactSync';
import { Capacitor } from '@capacitor/core';

interface ContactSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactSyncModal({ isOpen, onClose }: ContactSyncModalProps) {
  const [hasConsent, setHasConsent] = useState(false);
  const syncContacts = useSyncContacts();

  if (!isOpen) return null;
  if (!Capacitor.isNativePlatform()) {
    return null; // Only show on mobile
  }

  const handleSync = async () => {
    if (!hasConsent) return;
    
    try {
      const matches = await syncContacts.mutateAsync();
      // Show success - matches will be displayed in PYMK
      alert(`Found ${matches.length} friends from your contacts!`);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to sync contacts');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Find Friends from Contacts</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explainer */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-primary-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Connect with Friends</h3>
              <p className="text-sm text-gray-600">
                We'll help you find which of your contacts are already on SynC
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Your Privacy Matters</h3>
              <p className="text-sm text-gray-600">
                Phone numbers are hashed before upload. We never store plain phone numbers.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Check className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">You're in Control</h3>
              <p className="text-sm text-gray-600">
                You can disable contact sync anytime in Settings
              </p>
            </div>
          </div>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start space-x-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => setHasConsent(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            I agree to sync my contacts to find friends on SynC
          </span>
        </label>

        {/* Progress indicator */}
        {syncContacts.progress && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Syncing contacts...
              </span>
              <span className="text-sm text-blue-700">
                {syncContacts.progress.synced}/{syncContacts.progress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(syncContacts.progress.synced / syncContacts.progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={syncContacts.isPending}
            className="flex-1 btn btn-secondary"
          >
            Maybe Later
          </button>
          <button
            onClick={handleSync}
            disabled={!hasConsent || syncContacts.isPending}
            className="flex-1 btn btn-primary"
          >
            {syncContacts.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Contacts'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**`src/components/contacts/ContactMatchesList.tsx`**

```typescript
/**
 * Contact Matches List
 * Story 9.2.3: Display matched contacts from sync
 */

import React from 'react';
import { Users } from 'lucide-react';
import { useContactMatches } from '@/hooks/useContactSync';
import { useSendFriendRequest } from '@/hooks/useFriendRequests';
import { useNavigate } from 'react-router-dom';

export function ContactMatchesList() {
  const { data: matches, isLoading } = useContactMatches();
  const sendFriendRequest = useSendFriendRequest();
  const navigate = useNavigate();

  if (isLoading) {
    return <ContactMatchesSkeleton />;
  }

  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2" />
        Friends from Contacts ({matches.length})
      </h3>
      
      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.user_id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
            onClick={() => navigate(`/profile/${match.user_id}`)}
          >
            <div className="flex items-center space-x-3">
              <img
                src={match.avatar_url || '/default-avatar.png'}
                alt={match.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">{match.full_name}</h4>
                <p className="text-sm text-gray-500">@{match.username}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                sendFriendRequest.mutate(match.user_id);
              }}
              disabled={sendFriendRequest.isPending}
              className="btn btn-primary btn-sm"
            >
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactMatchesSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 mb-2">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎯 **MCP Integration**

### Supabase MCP
```bash
# Apply migration
warp mcp run supabase "apply_migration mobile-app-setup 20250127_contact_sync ..."

# Test contact matching
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM match_contacts(auth.uid(), ARRAY['hash1', 'hash2'])"

# Verify privacy (no plain phone numbers)
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM contact_hashes LIMIT 10"
```

### Context7 MCP
```bash
# Find Capacitor plugin integration points
warp mcp run context7 "find usage of Contacts plugin"

# Analyze contact sync service
warp mcp run context7 "analyze src/services/contactSyncService.ts"
```

### Puppeteer MCP
```bash
# Test permission flow (iOS simulator)
warp mcp run puppeteer "navigate to app, click sync contacts, handle permission dialog"

# Verify matches appear in PYMK
warp mcp run puppeteer "after contact sync, verify PYMK shows 'From contacts' badge"
```

---

## ✅ **Definition of Done**

- [ ] All 29 acceptance criteria met
- [ ] Database migration applied
- [ ] Capacitor Contacts plugin configured
- [ ] SHA-256 hashing implemented
- [ ] Permission flows tested (iOS & Android)
- [ ] Contact matches integrated with PYMK
- [ ] Privacy verified (no plain phone numbers)
- [ ] E2E tests pass on both platforms
- [ ] Background sync scheduled
- [ ] Documentation updated

---

## 📚 **Related Documentation**

- [Epic 9.2 Overview](../epics/EPIC_9.2_Friend_Discovery_Search.md)
- [Story 9.2.2 - PYMK Engine](./STORY_9.2.2_PYMK_Engine.md)
- [Capacitor Contacts Plugin](https://github.com/capacitor-community/contacts)

---

**Next Story:** [STORY 9.2.4 - Search Filters & Advanced Search](./STORY_9.2.4_Search_Filters_Advanced.md)
