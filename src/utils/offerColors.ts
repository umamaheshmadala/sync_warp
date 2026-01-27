// src/utils/offerColors.ts

// Maps Offer Categories to Tailwind CSS background classes
// Based on the "Trendy" color scheme approved by the user

const categoryColorMap: Record<string, string> = {
    // 1. Product-based / BOGO - Pink (Eye-catching, Free)
    'Product-based / BOGO': 'bg-pink-600',

    // 2. Bundles & Combos - Purple (Premium Value)
    'Bundles & Combos': 'bg-purple-600',

    // 3. Quantity / Volume - Indigo (Bulk, Solid)
    'Quantity / Volume': 'bg-indigo-600',

    // 4. Price-based - Green (Money/Savings)
    'Price-based': 'bg-green-600',

    // 5. Cashback & Wallet - Emerald (Cash back)
    'Cashback & Wallet': 'bg-emerald-600',

    // 6. Cart / Order-based - Teal (Shopping)
    'Cart / Order-based': 'bg-teal-600',

    // 7. Customer Segment - Blue (Trustworthy)
    'Customer Segment': 'bg-blue-600',

    // 8. Time-based - Red (Urgency, Sale)
    'Time-based': 'bg-red-600',

    // 9. Coupon / Promo-based - Orange (Classic Coupon)
    'Coupon / Promo-based': 'bg-orange-500',

    // 10. Psychological Pricing - Yellow (Alert, Warning)
    'Psychological Pricing': 'bg-yellow-600',

    // 11. Channel / Payment-based - Cyan (Digital/Tech)
    'Channel / Payment-based': 'bg-cyan-600',

    // 12. Gifts & Freebies - Rose (Gift wrap)
    'Gifts & Freebies': 'bg-rose-500',

    // 13. Subscription - Violet (Recurring/Premium)
    'Subscription': 'bg-violet-600',

    // 14. Value-added - Sky (Light/Bonus)
    'Value-added': 'bg-sky-600',

    // 15. Special / Risk-Free - Lime (Safe/Green light)
    'Special / Risk-Free': 'bg-lime-600',

    // 16. Gamified / Engagement - Fuchsia (Playful/Fun)
    'Gamified / Engagement': 'bg-fuchsia-600',
};

// Default fallback color
const DEFAULT_COLOR = 'bg-gray-600';

/**
 * Returns the Tailwind background color class for a given offer category.
 * @param categoryName The name of the offer category
 * @returns Tailwind CSS class string (e.g., 'bg-purple-600')
 */
export const getOfferColor = (categoryName?: string | null): string => {
    if (!categoryName) return DEFAULT_COLOR;
    return categoryColorMap[categoryName] || DEFAULT_COLOR;
};
