// src/hooks/useWebShare.ts
// Reusable hook for Web Share API with clipboard fallback + tracking
// Story 4.9 - Social Sharing Actions

import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import { trackShare, type ShareEvent, buildUtmUrl } from '@/services/shareTracker';

export interface ShareData {
  title: string;
  text?: string;
  url: string;
  files?: File[]; // Optional for future file sharing support
}

export interface UseWebShareOptions {
  entityType: ShareEvent['type'];
  entityId: string;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseWebShareReturn {
  share: (data: ShareData) => Promise<boolean>;
  copyToClipboard: (url: string) => Promise<boolean>;
  isSupported: boolean;
  isSharing: boolean;
  error: Error | null;
}

/**
 * Hook for sharing content using Web Share API with clipboard fallback and analytics tracking
 */
export function useWebShare(options?: UseWebShareOptions): UseWebShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if Web Share API is supported
  const isSupported = typeof navigator !== 'undefined' && navigator.share !== undefined;

  // Copy text to clipboard (with basic fallback)
  const copyToClipboard = useCallback(async (url: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      toast.success('Link copied to clipboard!', { duration: 3000, position: 'bottom-center' });
      return true;
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
      toast.error('Failed to copy link. Please try again.', { duration: 4000, position: 'bottom-center' });
      return false;
    }
  }, []);

  // Share content using native API or clipboard fallback, and track
  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    const entityType = options?.entityType;
    const entityId = options?.entityId;

    try {
      // Prefer native Web Share
      if (isSupported) {
        const urlWithUtm = entityType ? buildUtmUrl(data.url, 'share_button', 'native', entityType) : data.url;

        try {
          await navigator.share({
            title: data.title,
            text: data.text,
            url: urlWithUtm,
            // files: data.files // enable when needed
          });

          // Track native share if identifiers provided
          if (entityType && entityId) {
            await trackShare({
              type: entityType,
              entity_id: entityId,
              method: 'web_share',
              metadata: { ...options?.metadata, title: data.title, has_text: !!data.text }
            });
          }

          toast.success('Shared successfully!', { duration: 3000, position: 'bottom-center' });
          options?.onSuccess?.();
          return true;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            // user cancelled - do not treat as error
            return false;
          }
          // fall through to clipboard
          console.warn('Web Share failed, falling back to clipboard:', err);
        }
      }

      // Fallback: copy URL
      const urlWithUtm = entityType ? buildUtmUrl(data.url, 'share_button', 'copy', entityType) : data.url;
      const copied = await copyToClipboard(urlWithUtm);
      if (!copied) throw new Error('Failed to copy link');

      if (entityType && entityId) {
        await trackShare({
          type: entityType,
          entity_id: entityId,
          method: 'copy',
          metadata: { ...options?.metadata, title: data.title, fallback: !isSupported }
        });
      }

      options?.onSuccess?.();
      return true;
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Share failed');
      setError(err);
      options?.onError?.(err);
      console.error('Share error:', err);
      toast.error(err.message || 'Failed to share', { duration: 4000, position: 'bottom-center' });
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [isSupported, options, copyToClipboard]);

  return { share, copyToClipboard, isSupported, isSharing, error };
}
