import React, { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useProducts } from '../../../hooks/useProducts';
import { toast } from 'react-hot-toast';

interface ProductNotificationToggleProps {
    productId: string;
    isEnabled: boolean;
    isOwner: boolean;
    className?: string;
    onToggle?: (enabled: boolean) => void; // Optional controlled mode
}

export const ProductNotificationToggle: React.FC<ProductNotificationToggleProps> = ({
    productId,
    isEnabled: initialEnabled,
    isOwner,
    className = '',
    onToggle
}) => {
    const { updateNotificationSetting } = useProducts();
    const [enabled, setEnabled] = useState(initialEnabled);
    const [updating, setUpdating] = useState(false);

    // Sync validation logic if needed
    // if (!isOwner) return null; // Logic moved inside render or kept? Kept.

    const handleToggle = async () => {
        if (updating) return;

        // Controlled mode (for Creation Wizard)
        if (onToggle) {
            const newState = !enabled;
            setEnabled(newState); // Optimistic local
            onToggle(newState);
            return;
        }

        try {
            setUpdating(true);
            const newState = !enabled;
            // ... existing logic ...
            setEnabled(newState);
            const success = await updateNotificationSetting(productId, newState);
            if (!success) {
                setEnabled(!newState);
                toast.error('Failed to update notification settings');
            } else {
                toast.success(`Notifications ${newState ? 'enabled' : 'disabled'} for this product`);
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
            setEnabled(!enabled);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${className}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                    {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className="text-sm font-medium text-gray-900">
                        Product Notifications
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {enabled
                            ? "You'll receive alerts for likes and comments."
                            : "Notifications specific to this product are muted."}
                    </p>
                </div>
            </div>

            <button
                onClick={handleToggle}
                disabled={updating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
            >
                {updating ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                    </span>
                ) : (
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                )}
            </button>
        </div>
    );
};
