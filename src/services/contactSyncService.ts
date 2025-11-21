/**
 * Contact Sync Service - iOS/Android Contact Matching
 * Story 9.2.3: Contact Sync Integration
 */

import { Contacts, Contact } from '@capacitor-community/contacts';
import { supabase } from '../lib/supabase';
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
    console.error('Failed to log sync event:', JSON.stringify(error));
  }
}

/**
 * Sync contacts from device
 */
export async function syncContacts(
  onProgress?: (progress: SyncProgress) => void
): Promise<ContactMatch[]> {
  const startTime = Date.now();
  try {
    // Log sync started
    await logSyncEvent('started');

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

    // Extract and hash phone numbers (use Set to avoid duplicates)
    const phoneHashSet = new Set<string>();
    let processed = 0;

    for (const contact of contacts) {
      if (contact.phones && contact.phones.length > 0) {
        for (const phone of contact.phones) {
          if (phone.number) {
            try {
              const hash = await hashPhoneNumber(phone.number);
              phoneHashSet.add(hash); // Set automatically deduplicates
            } catch (error) {
              console.error('Failed to hash phone number:', error);
            }
          }
        }
      }

      processed++;
      onProgress?.({ total: contacts.length, synced: processed, matches: 0 });
    }

    // Convert Set to Array for database upload
    const phoneHashes = Array.from(phoneHashSet);

    // Upload hashed phone numbers to database
    const { error: uploadError } = await supabase.rpc('upsert_contact_hashes', {
      p_user_id: user.id,
      p_phone_hashes: phoneHashes,
    });

    if (uploadError) {
      console.error('Failed to upload contact hashes:', uploadError.message, uploadError.details, uploadError.hint);
      throw new Error(`Failed to sync contacts: ${uploadError.message}`);
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
    const matchedUserIds = matches?.map((m: ContactMatch) => m.user_id) || [];
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

    const duration = Date.now() - startTime;

    // Log sync completed
    await logSyncEvent('completed', {
      contactsCount: contacts.length,
      matchesFound: matches?.length || 0,
      durationMs: duration,
    });

    return matches || [];
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
        email,
        avatar_url
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to get contact matches:', error);
    return [];
  }

  return data?.map((m: any) => ({
    user_id: m.matched_user_id,
    full_name: m.profiles.full_name,
    username: m.profiles.email,
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

/**
 * Get last sync timestamp
 * Story 9.2.7: Contact Sync Enhancements
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
 * Story 9.2.7: Contact Sync Enhancements
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
