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
        <div className={`flex items-center justify-between ${className}`}>
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

            {/* Horizontal pill toggle — track is explicitly wide so it can't look like a circle */}
            <button
                onClick={handleToggle}
                disabled={updating}
                aria-checked={enabled}
                role="switch"
                style={{ width: '52px', height: '28px', minWidth: '52px' }}
                className={`relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            >
                {updating ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                    </span>
                ) : (
                    <span
                        style={{
                            width: '20px',
                            height: '20px',
                            transform: enabled ? 'translateX(28px)' : 'translateX(4px)',
                        }}
                        className="absolute top-1 inline-block rounded-full bg-white shadow-md transition-transform duration-200"
                    />
                )}
            </button>
        </div>
    );
};
