import { SupportedStorage } from '@supabase/supabase-js';
import SecureStorage from './secureStorage';

/**
 * Custom Supabase Storage Adapter
 * Integrates SecureStorage with Supabase auth
 */
export class SupabaseStorageAdapter implements SupportedStorage {
  async getItem(key: string): Promise<string | null> {
    return await SecureStorage.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await SecureStorage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await SecureStorage.remove(key);
  }
}

export const supabaseStorage = new SupabaseStorageAdapter();
