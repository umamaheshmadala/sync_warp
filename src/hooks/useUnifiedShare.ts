// src/hooks/useUnifiedShare.ts
// React hook for unified sharing functionality (Story 10.1.1)

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { unifiedShareService } from '../services/unifiedShareService';
import { usePlatform } from './usePlatform';
import {
    ShareOptions,
    ShareMethod,
    ShareResult,
    ShareError,
    SocialPlatform,
} from '../types/sharing';
import { supabase } from '../lib/supabase';

/**
 * Hook return type
 */
interface UseUnifiedShareReturn {
    // Methods
    shareNative: (options: ShareOptions) => Promise<ShareResult>;
    shareClipboard: (options: ShareOptions) => Promise<ShareResult>;
    shareToPlatform: (options: ShareOptions, platform: SocialPlatform) => Promise<ShareResult>;
    shareToChat: (options: ShareOptions, friendIds: string[], message?: string) => Promise<ShareResult>;
    generateShareUrl: (options: ShareOptions, method: ShareMethod, shareEventId?: string) => string;

    // State
    isSharing: boolean;
    error: ShareError | null;
    lastShareResult: ShareResult | null;

    // Platform info
    isNativeShareSupported: boolean;
    platform: 'ios' | 'android' | 'web';
    isMobile: boolean;

    // Utilities
    resetError: () => void;
    canShare: (entityType: string, entityId: string) => boolean;
}

/**
 * useUnifiedShare Hook
 * 
 * Provides React-friendly access to the unified share service
 * with loading states, error handling, and platform detection.
 * 
 * @example
 * ```tsx
 * const { shareNative, shareClipboard, isSharing } = useUnifiedShare();
 * 
 * const handleShare = async () => {
 *   const result = await shareClipboard({
 *     entityType: 'storefront',
 *     entityId: businessId,
 *     entityData: { title, description, url }
 *   });
 *   if (result.success) toast.success('Link copied!');
 * };
 * ```
 */
export function useUnifiedShare(): UseUnifiedShareReturn {
    const queryClient = useQueryClient();
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<ShareError | null>(null);
    const [lastShareResult, setLastShareResult] = useState<ShareResult | null>(null);
    const [userId, setUserId] = useState<string | undefined>(undefined);

    const { platform, isMobile } = usePlatform();

    // Get current user ID
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id);
        });
    }, []);

    /**
     * Check if native share is supported
     */
    const isNativeShareSupported = useMemo(() => {
        return unifiedShareService.isNativeShareSupported();
    }, []);

    /**
     * Check if sharing is allowed (rate limit check)
     */
    const canShare = useCallback((entityType: string, entityId: string): boolean => {
        const result = unifiedShareService.checkRateLimit(userId, entityType, entityId);
        return result.allowed;
    }, [userId]);

    /**
     * Share via native share sheet
     */
    const shareNative = useCallback(async (options: ShareOptions): Promise<ShareResult> => {
        setIsSharing(true);
        setError(null);

        try {
            const result = await unifiedShareService.shareNative(options);
            setLastShareResult(result);

            if (!result.success && result.error) {
                setError({ type: 'unknown', message: result.error, retryable: true });
            }

            return result;
        } catch (err) {
            const shareError: ShareError = {
                type: 'unknown',
                message: err instanceof Error ? err.message : 'Share failed',
                retryable: true,
            };
            setError(shareError);
            throw err;
        } finally {
            setIsSharing(false);
        }
    }, []);

    /**
     * Share via clipboard
     */
    const shareClipboard = useCallback(async (options: ShareOptions): Promise<ShareResult> => {
        setIsSharing(true);
        setError(null);

        try {
            const result = await unifiedShareService.shareClipboard(options);
            setLastShareResult(result);

            if (!result.success && result.error) {
                setError({ type: 'unknown', message: result.error, retryable: true });
            }

            return result;
        } catch (err) {
            const shareError: ShareError = {
                type: 'unknown',
                message: err instanceof Error ? err.message : 'Copy failed',
                retryable: true,
            };
            setError(shareError);
            throw err;
        } finally {
            setIsSharing(false);
        }
    }, []);

    /**
     * Share to specific platform
     */
    const shareToPlatform = useCallback(async (
        options: ShareOptions,
        platform: SocialPlatform
    ): Promise<ShareResult> => {
        setIsSharing(true);
        setError(null);

        try {
            const result = await unifiedShareService.shareToPlatform(options, platform);
            setLastShareResult(result);

            if (!result.success && result.error) {
                setError({ type: 'unknown', message: result.error, retryable: true });
            }

            return result;
        } catch (err) {
            const shareError: ShareError = {
                type: 'unknown',
                message: err instanceof Error ? err.message : 'Share failed',
                retryable: true,
            };
            setError(shareError);
            throw err;
        } finally {
            setIsSharing(false);
        }
    }, []);

    // Share via in-app chat
    const shareToChat = useCallback(async (
        options: ShareOptions,
        friendIds: string[],
        message?: string
    ): Promise<ShareResult> => {
        setIsSharing(true);
        setError(null);

        try {
            const result = await unifiedShareService.shareToChat(options, friendIds, message);
            setLastShareResult(result);

            if (!result.success && result.error) {
                setError({ type: 'unknown', message: result.error, retryable: true });
            } else if (result.success) {
                // Invalidate messages cache to show the new message in chat immediately
                // This fixes the issue where sender doesn't see their own shared message
                queryClient.invalidateQueries({ queryKey: ['messages'] });
            }

            return result;
        } catch (err) {
            const shareError: ShareError = {
                type: 'unknown',
                message: err instanceof Error ? err.message : 'Share failed',
                retryable: true,
            };
            setError(shareError);
            throw err;
        } finally {
            setIsSharing(false);
        }
    }, [queryClient]);

    /**
     * Generate share URL with UTM parameters
     */
    const generateShareUrl = useCallback((
        options: ShareOptions,
        method: ShareMethod,
        shareEventId?: string
    ): string => {
        return unifiedShareService.generateShareUrl(options, method, shareEventId);
    }, []);

    /**
     * Reset error state
     */
    const resetError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // Methods
        shareNative,
        shareClipboard,
        shareToPlatform,
        shareToChat,
        generateShareUrl,

        // State
        isSharing,
        error,
        lastShareResult,

        // Platform info
        isNativeShareSupported,
        platform,
        isMobile,

        // Utilities
        resetError,
        canShare,
    };
}

export default useUnifiedShare;
