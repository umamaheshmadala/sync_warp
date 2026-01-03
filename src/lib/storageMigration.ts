import SecureStorage from './secureStorage';
import { Capacitor } from '@capacitor/core';

/**
 * Migrate from old localStorage to secure storage
 * Run this once on app startup
 */
export async function migrateToSecureStorage(): Promise<void> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('[Migration] Skipping - running on web');
    return;
  }

  // Check if migration already done
  const migrated = await SecureStorage.get('storage.migrated');
  if (migrated === 'true') {
    console.log('[Migration] Already migrated to secure storage');
    return;
  }

  console.log('[Migration] Starting migration to secure storage...');

  try {
    // Keys to migrate from localStorage
    const keysToMigrate = [
      'supabase.auth.token',
      'supabase.auth.refresh_token',
      'user.preferences'
    ];

    let migratedCount = 0;
    for (const key of keysToMigrate) {
      const value = localStorage.getItem(key);
      if (value) {
        await SecureStorage.set(key, value);
        localStorage.removeItem(key); // Remove from old storage
        migratedCount++;
        console.log(`[Migration] Migrated key: ${key}`);
      }
    }

    // Mark migration as complete
    await SecureStorage.set('storage.migrated', 'true');
    
    console.log(`[Migration] Complete! Migrated ${migratedCount} keys`);
  } catch (error) {
    console.error('[Migration] Failed:', error);
    // Don't throw - app should still work
  }
}
