
import { useMemo } from 'react';
import { Product, ProductTagConfig, ProductTagType } from '../types/product';
import { Sparkles, TrendingUp, AlertTriangle, Tag, Clock } from 'lucide-react';

export const TAG_CONFIGS: Record<ProductTagType, ProductTagConfig> = {
    new_arrival: {
        label: 'New Arrival',
        color: '#7C3AED', // Violet-600
        bgColor: '#F5F3FF', // Violet-50
        icon: 'Sparkles'
    },
    low_stock: {
        label: 'Low Stock',
        color: '#DC2626', // Red-600
        bgColor: '#FEF2F2', // Red-50
        icon: 'AlertTriangle'
    },
    sale: {
        label: 'Sale',
        color: '#EA580C', // Orange-600
        bgColor: '#FFF7ED', // Orange-50
        icon: 'Tag'
    },
    best_seller: {
        label: 'Best Seller',
        color: '#059669', // Emerald-600
        bgColor: '#ECFDF5', // Emerald-50
        icon: 'TrendingUp'
    },
    featured: {
        label: 'Featured',
        color: '#2563EB', // Blue-600
        bgColor: '#EFF6FF', // Blue-50
        icon: 'Star'
    },
    custom: {
        label: 'Tag',
        color: '#4B5563', // Gray-600
        bgColor: '#F3F4F6', // Gray-50
    }
};

export const useProductTags = (product: Product) => {
    // 1. New Arrival Logic (Auto)
    // Move logic outside of useMemo to avoid nested hook (though strictly it was just logic, standardizing it is safer)
    // Or simpler: calculate inside the main useMemo without calling a hook.

    const tags = useMemo(() => {
        const computedTags: { type: ProductTagType; config: ProductTagConfig }[] = [];

        // Check if created within last 7 days OR if valid expiration date exists
        let isNew = false;
        if (product.new_arrival_expires_at) {
            isNew = new Date(product.new_arrival_expires_at) > new Date();
        } else {
            const created = new Date(product.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            isNew = created > sevenDaysAgo;
        }

        if (isNew) {
            computedTags.push({ type: 'new_arrival', config: TAG_CONFIGS.new_arrival });
        }

        // 2. Manual Tags
        if (product.tags && Array.isArray(product.tags)) {
            product.tags.forEach(tagStr => {
                // Map string to known type or custom
                const knownType = Object.keys(TAG_CONFIGS).find(k => k === tagStr) as ProductTagType | undefined;
                if (knownType) {
                    // Avoid duplicates if logic overlap (e.g. if we add 'new_arrival' manually but it's computed)
                    if (knownType === 'new_arrival' && isNew) return;
                    computedTags.push({ type: knownType, config: TAG_CONFIGS[knownType] });
                } else {
                    // Custom tag
                    computedTags.push({
                        type: 'custom',
                        config: {
                            ...TAG_CONFIGS.custom,
                            label: tagStr.charAt(0).toUpperCase() + tagStr.slice(1).replace(/_/g, ' ')
                        }
                    });
                }
            });
        }

        // 3. Featured Flag (Legacy support)
        if (product.is_featured && !computedTags.some(t => t.type === 'featured')) {
            computedTags.push({ type: 'featured', config: TAG_CONFIGS.featured });
        }

        return computedTags;
    }, [product]);

    return { tags };
};
