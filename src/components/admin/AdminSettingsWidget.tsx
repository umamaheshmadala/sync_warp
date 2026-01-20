// =====================================================
// Admin Settings Widget
// =====================================================
// Provides toggle controls for admin-configurable settings

import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import {
    getAdminSettings,
    toggleGpsCheckinRequirement,
    type AdminSettings
} from '../../services/adminSettingsService';
import { toast } from 'sonner';

export function AdminSettingsWidget() {
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Load settings on mount
        async function load() {
            const data = await getAdminSettings();
            setSettings(data);
        }
        load();
    }, []);

    const handleToggleGpsCheckin = async () => {
        if (!settings) return;

        setIsUpdating(true);
        try {
            const newValue = !settings.requireGpsCheckinForReviews;
            await toggleGpsCheckinRequirement(newValue);

            // Refresh settings to confirm update
            const updated = await getAdminSettings();
            setSettings(updated);

            toast.success(
                newValue
                    ? 'GPS check-in requirement ENABLED for reviews'
                    : 'GPS check-in requirement DISABLED for reviews (Testing Mode)'
            );
        } catch (error) {
            toast.error('Failed to update setting');
        } finally {
            setIsUpdating(false);
        }
    };

    if (!settings) {
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-600 rounded-lg text-white">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Platform Settings</h3>
                        <p className="text-xs text-gray-500">Configure global platform behavior</p>
                    </div>
                </div>
            </div>

            {/* Settings List */}
            <div className="p-4 space-y-4">
                {/* GPS Check-in Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.requireGpsCheckinForReviews ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">GPS Check-in for Reviews</h4>
                            <p className="text-sm text-gray-500">
                                {settings.requireGpsCheckinForReviews
                                    ? 'Users must check in before writing reviews'
                                    : 'Users can write reviews without check-in (Testing Mode)'
                                }
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleGpsCheckin}
                        disabled={isUpdating}
                        className={`
              p-2 rounded-lg transition-all
              ${settings.requireGpsCheckinForReviews
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                        title={settings.requireGpsCheckinForReviews ? 'Click to disable' : 'Click to enable'}
                    >
                        {settings.requireGpsCheckinForReviews ? (
                            <ToggleRight size={32} />
                        ) : (
                            <ToggleLeft size={32} />
                        )}
                    </button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield size={14} />
                    <span>
                        Last updated: {new Date(settings.updatedAt).toLocaleString()}
                    </span>
                </div>

                {/* Warning when disabled */}
                {!settings.requireGpsCheckinForReviews && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                        <span className="font-medium">⚠️ Testing Mode Active:</span>
                        <span>Users can submit reviews without GPS verification. Re-enable before production.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminSettingsWidget;
