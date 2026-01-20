// =====================================================
// Admin Settings Service
// =====================================================
// Provides global admin-configurable settings
// Uses localStorage for persistence (can be migrated to database later)

const SETTINGS_KEY = 'sync_admin_settings';

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
 * Get current admin settings
 */
export function getAdminSettings(): AdminSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Error reading admin settings:', error);
    }
    return DEFAULT_SETTINGS;
}

/**
 * Update admin settings
 */
export function updateAdminSettings(updates: Partial<AdminSettings>): AdminSettings {
    const current = getAdminSettings();
    const updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        console.log('✅ Admin settings updated:', updated);
    } catch (error) {
        console.error('❌ Error saving admin settings:', error);
    }
    return updated;
}

/**
 * Check if GPS check-in is required for reviews
 */
export function isGpsCheckinRequired(): boolean {
    return getAdminSettings().requireGpsCheckinForReviews;
}

/**
 * Toggle GPS check-in requirement
 */
export function toggleGpsCheckinRequirement(enabled: boolean): void {
    updateAdminSettings({ requireGpsCheckinForReviews: enabled });
}

export default {
    getAdminSettings,
    updateAdminSettings,
    isGpsCheckinRequired,
    toggleGpsCheckinRequirement,
};
