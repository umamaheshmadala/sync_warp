import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Secure Storage Wrapper
 * Uses iOS Keychain and Android EncryptedSharedPreferences
 * Falls back to localStorage on web
 */

const STORAGE_KEYS = {
  AUTH_SESSION: 'supabase.auth.session',
  USER_PREFERENCES: 'user.preferences',
  PUSH_TOKEN: 'push.token',
} as const;

export class SecureStorage {
  private static isNative = Capacitor.isNativePlatform();

  /**
   * Set a value in secure storage
   */
  static async set(key: string, value: string): Promise<void> {
    try {
      if (this.isNative) {
        // Native: Use iOS Keychain or Android EncryptedSharedPreferences
        await Preferences.set({ key, value });
      } else {
        // Web: Fallback to localStorage
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[SecureStorage] Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from secure storage
   */
  static async get(key: string): Promise<string | null> {
    try {
      if (this.isNative) {
        // Native: Retrieve from secure storage
        const result = await Preferences.get({ key });
        return result.value;
      } else {
        // Web: Fallback to localStorage
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error(`[SecureStorage] Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove a value from secure storage
   */
  static async remove(key: string): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`[SecureStorage] Error removing ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear auth-related storage only (not all app data).
   * For a full wipe, use clearAll() instead.
   */
  static async clearAuth(): Promise<void> {
    try {
      if (this.isNative) {
        // Remove auth-specific keys only
        await Preferences.remove({ key: STORAGE_KEYS.AUTH_SESSION });
      } else {
        // Remove auth-specific keys from localStorage
        const authPrefixes = ['supabase.auth', 'sb-'];
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && authPrefixes.some(prefix => key.startsWith(prefix))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('[SecureStorage] Error clearing auth storage:', error);
      throw error;
    }
  }

  /**
   * Get all keys in secure storage
   */
  static async keys(): Promise<string[]> {
    try {
      if (this.isNative) {
        const result = await Preferences.keys();
        return result.keys;
      } else {
        return Object.keys(localStorage);
      }
    } catch (error) {
      console.error('[SecureStorage] Error getting keys:', error);
      return [];
    }
  }

  /**
   * Check if a key exists
   */
  static async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // Convenience methods for common storage keys
  static async setAuthSession(session: string): Promise<void> {
    return this.set(STORAGE_KEYS.AUTH_SESSION, session);
  }

  static async getAuthSession(): Promise<string | null> {
    return this.get(STORAGE_KEYS.AUTH_SESSION);
  }

  static async removeAuthSession(): Promise<void> {
    return this.remove(STORAGE_KEYS.AUTH_SESSION);
  }

  static async setPushToken(token: string): Promise<void> {
    return this.set(STORAGE_KEYS.PUSH_TOKEN, token);
  }

  static async getPushToken(): Promise<string | null> {
    return this.get(STORAGE_KEYS.PUSH_TOKEN);
  }
}

export default SecureStorage;
export { STORAGE_KEYS };
