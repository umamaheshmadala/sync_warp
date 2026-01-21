// =====================================================
// Story 11.2.3: Review Tags Data - Category-specific tags
// =====================================================

export interface Tag {
    id: string;
    label: string;
    icon: string;
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface TagRound {
    round: number;
    tags: Tag[];
}

export interface TagCategory {
    id: string;
    name: string;
    rounds: TagRound[];
}

// Core tags (Universal - all business types)
export const CORE_TAGS: TagCategory = {
    id: 'core',
    name: 'General',
    rounds: [
        {
            round: 1,
            tags: [
                { id: 'great_value', label: 'Great Value', icon: '💰', sentiment: 'positive' },
                { id: 'excellent_service', label: 'Excellent Service', icon: '⭐', sentiment: 'positive' },
                { id: 'clean_hygienic', label: 'Clean & Hygienic', icon: '✨', sentiment: 'positive' },
                { id: 'quick_efficient', label: 'Quick & Efficient', icon: '⚡', sentiment: 'positive' },
                { id: 'would_return', label: 'Would Return', icon: '🔄', sentiment: 'positive' },
            ]
        },
        {
            round: 2,
            tags: [
                { id: 'friendly_staff', label: 'Friendly Staff', icon: '😊', sentiment: 'positive' },
                { id: 'good_location', label: 'Good Location', icon: '📍', sentiment: 'positive' },
                { id: 'easy_parking', label: 'Easy Parking', icon: '🅿️', sentiment: 'positive' },
                { id: 'long_wait', label: 'Long Wait Time', icon: '⏰', sentiment: 'negative' },
                { id: 'overpriced', label: 'Overpriced', icon: '💸', sentiment: 'negative' },
            ]
        },
        {
            round: 3,
            tags: [
                { id: 'kid_friendly', label: 'Kid Friendly', icon: '👨‍👩‍👧', sentiment: 'positive' },
                { id: 'pet_friendly', label: 'Pet Friendly', icon: '🐕', sentiment: 'positive' },
                { id: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: '♿', sentiment: 'neutral' },
                { id: 'good_for_groups', label: 'Good for Groups', icon: '👥', sentiment: 'positive' },
                { id: 'covid_safe', label: 'COVID Safe Practices', icon: '😷', sentiment: 'positive' },
            ]
        }
    ]
};

// Restaurant/Food tags
export const RESTAURANT_TAGS: TagCategory = {
    id: 'restaurant',
    name: 'Food & Dining',
    rounds: [
        {
            round: 1,
            tags: [
                { id: 'delicious_food', label: 'Delicious Food', icon: '😋', sentiment: 'positive' },
                { id: 'fresh_ingredients', label: 'Fresh Ingredients', icon: '🌿', sentiment: 'positive' },
                { id: 'good_portions', label: 'Good Portions', icon: '🍽️', sentiment: 'positive' },
                { id: 'great_ambiance', label: 'Great Ambiance', icon: '🎵', sentiment: 'positive' },
                { id: 'worth_the_price', label: 'Worth the Price', icon: '💰', sentiment: 'positive' },
            ]
        },
        {
            round: 2,
            tags: [
                { id: 'quick_service', label: 'Quick Service', icon: '⚡', sentiment: 'positive' },
                { id: 'authentic_flavors', label: 'Authentic Flavors', icon: '🌶️', sentiment: 'positive' },
                { id: 'hygienic_kitchen', label: 'Hygienic Kitchen', icon: '✨', sentiment: 'positive' },
                { id: 'friendly_staff', label: 'Friendly Staff', icon: '😊', sentiment: 'positive' },
                { id: 'beautiful_presentation', label: 'Beautiful Presentation', icon: '🎨', sentiment: 'positive' },
            ]
        },
        {
            round: 3,
            tags: [
                { id: 'long_wait', label: 'Long Wait', icon: '⏰', sentiment: 'negative' },
                { id: 'limited_menu', label: 'Limited Menu', icon: '📋', sentiment: 'negative' },
                { id: 'overpriced', label: 'Overpriced', icon: '💸', sentiment: 'negative' },
                { id: 'not_for_kids', label: 'Not for Kids', icon: '🚫', sentiment: 'neutral' },
                { id: 'date_night', label: 'Perfect for Date Night', icon: '❤️', sentiment: 'positive' },
            ]
        }
    ]
};

// Service business tags (Salon, Spa, Fitness)
export const SERVICE_TAGS: TagCategory = {
    id: 'service',
    name: 'Services',
    rounds: [
        {
            round: 1,
            tags: [
                { id: 'professional', label: 'Professional Service', icon: '💼', sentiment: 'positive' },
                { id: 'clean_hygienic', label: 'Clean & Hygienic', icon: '✨', sentiment: 'positive' },
                { id: 'reasonable_prices', label: 'Reasonable Prices', icon: '💰', sentiment: 'positive' },
                { id: 'polite_staff', label: 'Polite Staff', icon: '😊', sentiment: 'positive' },
                { id: 'would_recommend', label: 'Would Recommend', icon: '👍', sentiment: 'positive' },
            ]
        },
        {
            round: 2,
            tags: [
                { id: 'on_time', label: 'On-Time Service', icon: '⏰', sentiment: 'positive' },
                { id: 'skilled_experts', label: 'Skilled Experts', icon: '🏆', sentiment: 'positive' },
                { id: 'relaxing_atmosphere', label: 'Relaxing Atmosphere', icon: '🧘', sentiment: 'positive' },
                { id: 'good_products', label: 'Good Products Used', icon: '🧴', sentiment: 'positive' },
                { id: 'easy_booking', label: 'Easy Booking', icon: '📅', sentiment: 'positive' },
            ]
        },
        {
            round: 3,
            tags: [
                { id: 'long_wait', label: 'Long Wait', icon: '⌛', sentiment: 'negative' },
                { id: 'too_expensive', label: 'Too Expensive', icon: '💸', sentiment: 'negative' },
                { id: 'rushed_service', label: 'Rushed Service', icon: '🏃', sentiment: 'negative' },
                { id: 'private_cabins', label: 'Private Cabins', icon: '🚪', sentiment: 'positive' },
                { id: 'ladies_only', label: 'Ladies Only', icon: '👩', sentiment: 'neutral' },
            ]
        }
    ]
};

// Retail tags
export const RETAIL_TAGS: TagCategory = {
    id: 'retail',
    name: 'Shopping',
    rounds: [
        {
            round: 1,
            tags: [
                { id: 'great_selection', label: 'Great Selection', icon: '🛍️', sentiment: 'positive' },
                { id: 'quality_products', label: 'Quality Products', icon: '⭐', sentiment: 'positive' },
                { id: 'fair_prices', label: 'Fair Prices', icon: '💰', sentiment: 'positive' },
                { id: 'helpful_staff', label: 'Helpful Staff', icon: '🙋', sentiment: 'positive' },
                { id: 'easy_returns', label: 'Easy Returns', icon: '🔄', sentiment: 'positive' },
            ]
        },
        {
            round: 2,
            tags: [
                { id: 'well_organized', label: 'Well Organized', icon: '📦', sentiment: 'positive' },
                { id: 'genuine_products', label: 'Genuine Products', icon: '✅', sentiment: 'positive' },
                { id: 'good_discounts', label: 'Good Discounts', icon: '🏷️', sentiment: 'positive' },
                { id: 'quick_billing', label: 'Quick Billing', icon: '💳', sentiment: 'positive' },
                { id: 'clean_store', label: 'Clean Store', icon: '✨', sentiment: 'positive' },
            ]
        },
        {
            round: 3,
            tags: [
                { id: 'limited_stock', label: 'Limited Stock', icon: '📉', sentiment: 'negative' },
                { id: 'overpriced', label: 'Overpriced', icon: '💸', sentiment: 'negative' },
                { id: 'pushy_staff', label: 'Pushy Staff', icon: '😤', sentiment: 'negative' },
                { id: 'good_for_gifts', label: 'Good for Gifts', icon: '🎁', sentiment: 'positive' },
                { id: 'trusted_brand', label: 'Trusted Brand', icon: '🏅', sentiment: 'positive' },
            ]
        }
    ]
};

/**
 * Get tags for a business category
 */
export function getTagsForCategory(category: string | undefined): TagCategory {
    if (!category) return CORE_TAGS;

    const categoryMap: Record<string, TagCategory> = {
        'food_dining': RESTAURANT_TAGS,
        'food & dining': RESTAURANT_TAGS,
        'restaurant': RESTAURANT_TAGS,
        'restaurants': RESTAURANT_TAGS,
        'cafe': RESTAURANT_TAGS,
        'cafes': RESTAURANT_TAGS,
        'health_beauty': SERVICE_TAGS,
        'health & beauty': SERVICE_TAGS,
        'salon': SERVICE_TAGS,
        'spa': SERVICE_TAGS,
        'gym': SERVICE_TAGS,
        'fitness': SERVICE_TAGS,
        'retail': RETAIL_TAGS,
        'shopping': RETAIL_TAGS,
    };

    return categoryMap[category.toLowerCase()] || CORE_TAGS;
}

/**
 * Get all tags up to a specific round
 */
export function getTagsUpToRound(category: TagCategory, round: number): Tag[] {
    return category.rounds
        .filter(r => r.round <= round)
        .flatMap(r => r.tags);
}

/**
 * Build a lookup map for all tags (for display component)
 */
export function buildTagLookupMap(): Map<string, Tag> {
    const allTags = [
        ...CORE_TAGS.rounds.flatMap(r => r.tags),
        ...RESTAURANT_TAGS.rounds.flatMap(r => r.tags),
        ...SERVICE_TAGS.rounds.flatMap(r => r.tags),
        ...RETAIL_TAGS.rounds.flatMap(r => r.tags),
    ];

    return new Map(allTags.map(tag => [tag.id, tag]));
}

// Export a pre-built map for efficiency
export const TAG_LOOKUP_MAP = buildTagLookupMap();
