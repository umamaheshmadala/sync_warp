// src/components/friends/privacy/ReadReceiptPrivacy.tsx
// Privacy toggle for read receipts (reciprocal opt-out)
// Story: 8.5.1 - Read Receipts

import React from 'react';
import { CheckCheck, EyeOff } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';

/**
 * Read Receipt Privacy Toggle
 * 
 * Implements the reciprocal opt-out pattern like WhatsApp:
 * - When disabled, user won't SEND read receipts (others won't see when you've read)
 * - When disabled, user also won't SEE others' read receipts
 * 
 * This ensures fairness - you can't have privacy while monitoring others.
 */
export function ReadReceiptPrivacy() {
    const { settings, updateSettings, isUpdating } = usePrivacySettings();

    // Default to true if setting doesn't exist
    const isEnabled = settings?.read_receipts_enabled !== false;

    const handleToggle = async (checked: boolean) => {
        try {
            await updateSettings({ read_receipts_enabled: checked });
            toast.success(
                checked
                    ? 'Read receipts enabled'
                    : 'Read receipts disabled. You also won\'t see when others read your messages.'
            );
        } catch (error) {
            toast.error('Failed to update setting');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-900">Read Receipts</p>
                    <p className="text-xs text-gray-500">
                        Others can see when you've read their messages
                    </p>
                </div>

                <Switch
                    checked={isEnabled}
                    onCheckedChange={handleToggle}
                    disabled={isUpdating}
                />
            </div>

            {/* Reciprocal warning */}

        </div>
    );
}
