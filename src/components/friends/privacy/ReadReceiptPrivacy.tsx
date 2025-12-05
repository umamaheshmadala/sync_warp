// src/components/friends/privacy/ReadReceiptPrivacy.tsx
// Privacy toggle for read receipts (reciprocal opt-out)
// Story: 8.5.1 - Read Receipts

import React from 'react';
import { CheckCheck, EyeOff } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

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

    const handleToggle = async () => {
        try {
            await updateSettings({ read_receipts_enabled: !isEnabled });
            toast.success(
                isEnabled 
                    ? 'Read receipts disabled. You also won\'t see when others read your messages.'
                    : 'Read receipts enabled'
            );
        } catch (error) {
            toast.error('Failed to update setting');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isEnabled ? "bg-cyan-100" : "bg-gray-100"
                    )}>
                        {isEnabled ? (
                            <CheckCheck className="h-5 w-5 text-cyan-600" />
                        ) : (
                            <EyeOff className="h-5 w-5 text-gray-500" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900">Read Receipts</h4>
                        <p className="text-sm text-gray-500">
                            Show when you've read messages
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={handleToggle}
                    disabled={isUpdating}
                    className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
                        isEnabled ? "bg-cyan-500" : "bg-gray-200",
                        isUpdating && "opacity-50 cursor-not-allowed"
                    )}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label="Toggle read receipts"
                >
                    <span
                        className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            isEnabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
            </div>

            {/* Reciprocal warning */}
            <div className={cn(
                "p-3 rounded-lg text-sm",
                isEnabled ? "bg-cyan-50 text-cyan-800" : "bg-amber-50 text-amber-800"
            )}>
                {isEnabled ? (
                    <p className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-cyan-600" />
                        Others can see when you've read their messages
                    </p>
                ) : (
                    <p className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-amber-600" />
                        <span>
                            <strong>Reciprocal:</strong> You also won't see when others have read your messages
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
}
