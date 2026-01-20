// =====================================================
// Admin Settings Service
// =====================================================
// Provides global admin-configurable settings
// Uses 'system_settings' table in database for global persistence.

import { supabase } from '../lib/supabase';

export interface AdminSettings {
    /** If true, GPS check-in is required before writing a review */
    requireGpsCheckinForReviews: boolean;
    /** Timestamp of last settings update */
    updatedAt: string;
}

const DEFAULT_SETTINGS: AdminSettings = {
    requireGpsCheckinForReviews: true, // Default: require check-in
    updatedAt: new Date().toISOString(),
};

/**
 * Get current admin settings from Database
 */
export async function getAdminSettings(): Promise<AdminSettings> {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('key, value, updated_at')
            .in('key', ['require_gps_checkin_for_reviews']);

        if (error) throw error;

        const settings: AdminSettings = { ...DEFAULT_SETTINGS };

        data?.forEach((row) => {
            if (row.key === 'require_gps_checkin_for_reviews') {
                settings.requireGpsCheckinForReviews = row.value as boolean;
                settings.updatedAt = row.updated_at;
            }
        });

        return settings;
    } catch (error) {
        console.error('Error reading admin settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Update a specific system setting
 */
export async function updateSystemSetting(key: string, value: any): Promise<void> {
    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error(`❌ Error updating setting ${key}:`, error);
        throw error;
    }
    console.log(`✅ Setting ${key} updated:`, value);
}

/**
 * Initialize/Sync settings (helper for initial check)
 * Returns the boolean value for GPS requirement
 */
export async function fetchGpsCheckinRequirement(): Promise<boolean> {
    const settings = await getAdminSettings();
    return settings.requireGpsCheckinForReviews;
}

/**
 * Toggle GPS check-in requirement
 */
export async function toggleGpsCheckinRequirement(enabled: boolean): Promise<void> {
    await updateSystemSetting('require_gps_checkin_for_reviews', enabled);
}

export default {
    getAdminSettings,
    updateSystemSetting,
    fetchGpsCheckinRequirement,
    toggleGpsCheckinRequirement,
};
