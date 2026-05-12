import React, { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Product } from '../../../types/product';
import { ProductTagDisplay } from '../tags/ProductTagDisplay';
import { useProductTags } from '../../../hooks/useProductTags';
import { useProductViewTracking } from '../../../hooks/useProductAnalytics';
import { useProducts } from '../../../hooks/useProducts';
import { useAuthStore } from '../../../store/authStore';
import { ProductDescription } from '../details/ProductDescription';

interface MobileProductDetailsProps {
    product: Product;
}

export const MobileProductDetails: React.FC<MobileProductDetailsProps> = ({ product }) => {
    // Use the hook to get distinct, configured tags (includes New Arrival logic, formatting)
    const { tags } = useProductTags(product);
    const user = useAuthStore((state) => state.user);
    const { updateNotificationSetting } = useProducts();

    // Analytics: Track view
    useProductViewTracking(product.id);

    // Notification State
    const [notificationsEnabled, setNotificationsEnabled] = useState(product.notifications_enabled ?? true);
    const [updatingNotification, setUpdatingNotification] = useState(false);
    const isOwner = user?.id && product?.business_id && product.businesses &&
        (Array.isArray(product.businesses)
            ? (product.businesses[0] as any)?.owner_id === user.id
            : (product.businesses as any)?.owner_id === user.id);

    // Status visual mapping
    const isSoldOut = product.status === 'sold_out';

    const handleNotificationToggle = async () => {
        if (updatingNotification) return;
        setUpdatingNotification(true);
        const newState = !notificationsEnabled;
        setNotificationsEnabled(newState); // Optimistic
        try {
            const success = await updateNotificationSetting(product.id, newState);
            if (!success) {
                setNotificationsEnabled(!newState); // Revert
            }
        } catch {
            setNotificationsEnabled(!newState); // Revert
        } finally {
            setUpdatingNotification(false);
        }
    };

    return (
        <div className="px-4 pb-4 pt-1 space-y-2">
            {/* Title Row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">
                        {product.name}
                    </h2>
                    {/* Notification Bell for Owners */}
                    {isOwner && (
                        <button
                            onClick={handleNotificationToggle}
                            disabled={updatingNotification}
                            className={`p-1.5 rounded-full transition-colors ml-2 ${notificationsEnabled
                                ? 'text-blue-600 hover:bg-blue-50'
                                : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            {updatingNotification ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : notificationsEnabled ? (
                                <Bell className="w-5 h-5" />
                            ) : (
                                <BellOff className="w-5 h-5" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {isSoldOut && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Sold Out
                    </span>
                )}
                {tags.map((tagItem, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium leading-none whitespace-nowrap"
                        style={{
                            backgroundColor: tagItem.config.bgColor,
                            color: tagItem.config.color || '#000',
                            border: `1px solid ${tagItem.config.color || '#000'}20` // Subtle border using color + 20% opacity
                        }}
                    >
                        {tagItem.config.label}
                    </span>
                ))}
            </div>

            {/* Description */}
            <ProductDescription
                text={product.description}
                maxLength={100}
                className="leading-relaxed"
            />
        </div>
    );
};
