/**
 * Deep Link Store
 * 
 * Global state management for opening modals from anywhere in the app
 * (especially from chat message links - Story 10.1.8 AC-18)
 * 
 * Supports:
 * - Offer Details Modal
 * - Friend Profile Modal
 * - Product View Modal
 * - Business Profile navigation
 */

import { create } from 'zustand';

export interface DeepLinkTarget {
    type: 'offer' | 'profile' | 'business' | 'product';
    entityId: string;
    businessId?: string; // For products and business-scoped offers
}

interface DeepLinkState {
    // Current modal target
    currentTarget: DeepLinkTarget | null;

    // Offer modal state
    offerModalOpen: boolean;
    offerId: string | null;

    // Profile modal state
    profileModalOpen: boolean;
    profileUserId: string | null;

    // Product modal state
    productModalOpen: boolean;
    productId: string | null;
    productBusinessId: string | null;
    productPreviewImage: string | null;

    // Actions
    openOffer: (offerId: string) => void;
    openProfile: (userId: string) => void;
    openProduct: (productId: string, businessId?: string, previewImage?: string) => void;
    closeAll: () => void;

    // Parse and handle deep link
    handleDeepLink: (url: string) => boolean;
}

/**
 * Parse a URL to extract the deep link target
 */
export function parseDeepLink(url: string): DeepLinkTarget | null {
    try {
        // Parse the URL to get the pathname
        const urlObj = new URL(url, window.location.origin);
        const pathname = urlObj.pathname;

        // Match patterns in order of specificity

        // /business/{businessId}/offer/{offerId}
        const businessOfferMatch = pathname.match(/\/business\/([^\/]+)\/offer\/([a-f0-9-]+)/i);
        if (businessOfferMatch) {
            return {
                type: 'offer',
                entityId: businessOfferMatch[2],
                businessId: businessOfferMatch[1],
            };
        }

        // /offers/{offerId}
        const offerMatch = pathname.match(/\/offers\/([a-f0-9-]+)/i);
        if (offerMatch) {
            return {
                type: 'offer',
                entityId: offerMatch[1],
            };
        }

        // /business/{businessId}/products/{productId}
        const productMatch = pathname.match(/\/business\/([^\/]+)\/products\/([a-f0-9-]+)/i);
        if (productMatch) {
            return {
                type: 'product',
                entityId: productMatch[2],
                businessId: productMatch[1],
            };
        }

        // /profile/{userId} or /user/{userId}
        const profileMatch = pathname.match(/\/(profile|user)\/([a-f0-9-]+)/i);
        if (profileMatch) {
            return {
                type: 'profile',
                entityId: profileMatch[2],
            };
        }

        // /business/{businessId} (must be last - most general pattern)
        const businessMatch = pathname.match(/\/business\/([^\/]+)\/?$/i);
        if (businessMatch) {
            return {
                type: 'business',
                entityId: businessMatch[1], // Could be ID or slug
            };
        }

        return null;
    } catch {
        return null;
    }
}

export const useDeepLinkStore = create<DeepLinkState>((set, get) => ({
    currentTarget: null,

    // Offer modal
    offerModalOpen: false,
    offerId: null,

    // Profile modal
    profileModalOpen: false,
    profileUserId: null,

    // Product modal
    productModalOpen: false,
    productId: null,
    productBusinessId: null,
    productPreviewImage: null,

    openOffer: (offerId: string) => {
        set({
            offerModalOpen: true,
            offerId,
            currentTarget: { type: 'offer', entityId: offerId },
        });
    },

    openProfile: (userId: string) => {
        set({
            profileModalOpen: true,
            profileUserId: userId,
            currentTarget: { type: 'profile', entityId: userId },
        });
    },

    openProduct: (productId: string, businessId?: string, previewImage?: string) => {
        set({
            productModalOpen: true,
            productId,
            productBusinessId: businessId || null,
            productPreviewImage: previewImage || null,
            currentTarget: { type: 'product', entityId: productId, businessId },
        });
    },

    closeAll: () => {
        set({
            currentTarget: null,
            offerModalOpen: false,
            offerId: null,
            profileModalOpen: false,
            profileUserId: null,
            productModalOpen: false,
            productId: null,
            productBusinessId: null,
            productPreviewImage: null,
        });
    },

    handleDeepLink: (url: string): boolean => {
        const target = parseDeepLink(url);
        if (!target) return false;

        const { openOffer, openProfile, openProduct } = get();

        switch (target.type) {
            case 'offer':
                openOffer(target.entityId);
                return true;
            case 'profile':
                openProfile(target.entityId);
                return true;
            case 'product':
                if (target.businessId) {
                    openProduct(target.entityId, target.businessId);
                    return true;
                }
                return false;
            case 'business':
                // Business navigation is handled by the caller (navigate to page)
                return false;
            default:
                return false;
        }
    },
}));
