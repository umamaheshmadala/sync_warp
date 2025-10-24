// src/hooks/useOfferShare.ts
// React hook for tracking Offer Shares and Clicks (Story 4.12)

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ShareChannel } from '../types/offers';

interface UseOfferShareOptions {
  offerId: string;
  businessId: string;
  userId?: string;
}

interface UseOfferShareReturn {
  isSharing: boolean;
  isTracking: boolean;
  error: string | null;
  
  // Share operations
  trackShare: (channel: ShareChannel, sharedToUserId?: string) => Promise<boolean>;
  trackClick: (shareId: string) => Promise<boolean>;
  trackView: () => Promise<boolean>;
  
  // Social sharing helpers
  shareToWhatsApp: (message: string) => Promise<boolean>;
  shareToFacebook: (url: string) => Promise<boolean>;
  shareToTwitter: (text: string, url: string) => Promise<boolean>;
  shareViaEmail: (subject: string, body: string) => Promise<boolean>;
  copyShareLink: (url: string) => Promise<boolean>;
}

export const useOfferShare = (options: UseOfferShareOptions): UseOfferShareReturn => {
  const { offerId, businessId, userId } = options;

  const [isSharing, setIsSharing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track when an offer is shared
  const trackShare = useCallback(async (
    channel: ShareChannel,
    sharedToUserId?: string
  ): Promise<boolean> => {
    setIsTracking(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('offer_shares')
        .insert({
          offer_id: offerId,
          business_id: businessId,
          sharer_id: userId || null,
          share_channel: channel,
          shared_to_user_id: sharedToUserId || null,
        });

      if (insertError) throw insertError;

      // Call the database function to update analytics
      const { error: functionError } = await supabase.rpc('track_offer_share', {
        p_offer_id: offerId,
        p_sharer_id: userId || null,
        p_share_channel: channel,
      });

      if (functionError) {
        console.warn('Analytics tracking failed:', functionError);
        // Don't throw - the share itself succeeded
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to track share');
      console.error('Error tracking share:', err);
      return false;
    } finally {
      setIsTracking(false);
    }
  }, [offerId, businessId, userId]);

  // Track when a shared offer is clicked
  const trackClick = useCallback(async (shareId: string): Promise<boolean> => {
    setIsTracking(true);
    setError(null);

    try {
      // Update the share record
      const { error: updateError } = await supabase
        .from('offer_shares')
        .update({
          was_clicked: true,
          clicked_at: new Date().toISOString(),
        })
        .eq('id', shareId);

      if (updateError) throw updateError;

      // Call the database function to update analytics
      const { error: functionError } = await supabase.rpc('track_offer_click', {
        p_offer_id: offerId,
        p_user_id: userId || null,
        p_click_source: 'share_link',
      });

      if (functionError) {
        console.warn('Analytics tracking failed:', functionError);
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to track click');
      console.error('Error tracking click:', err);
      return false;
    } finally {
      setIsTracking(false);
    }
  }, [offerId, userId]);

  // Track when an offer is viewed
  const trackView = useCallback(async (): Promise<boolean> => {
    setIsTracking(true);
    setError(null);

    try {
      const { error: functionError } = await supabase.rpc('track_offer_view', {
        p_offer_id: offerId,
        p_viewer_id: userId || null,
      });

      if (functionError) throw functionError;

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to track view');
      console.error('Error tracking view:', err);
      return false;
    } finally {
      setIsTracking(false);
    }
  }, [offerId, userId]);

  // Share to WhatsApp
  const shareToWhatsApp = useCallback(async (message: string): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    try {
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      await trackShare('whatsapp');
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to share to WhatsApp');
      console.error('Error sharing to WhatsApp:', err);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [trackShare]);

  // Share to Facebook
  const shareToFacebook = useCallback(async (url: string): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    try {
      const encodedUrl = encodeURIComponent(url);
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      
      window.open(facebookUrl, '_blank', 'width=600,height=400');
      
      await trackShare('facebook');
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to share to Facebook');
      console.error('Error sharing to Facebook:', err);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [trackShare]);

  // Share to Twitter
  const shareToTwitter = useCallback(async (text: string, url: string): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    try {
      const encodedText = encodeURIComponent(text);
      const encodedUrl = encodeURIComponent(url);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      
      window.open(twitterUrl, '_blank', 'width=600,height=400');
      
      await trackShare('twitter');
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to share to Twitter');
      console.error('Error sharing to Twitter:', err);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [trackShare]);

  // Share via Email
  const shareViaEmail = useCallback(async (subject: string, body: string): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    try {
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(body);
      const mailtoUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
      
      window.location.href = mailtoUrl;
      
      await trackShare('other'); // Email doesn't have a dedicated channel
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to share via email');
      console.error('Error sharing via email:', err);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [trackShare]);

  // Copy share link to clipboard
  const copyShareLink = useCallback(async (url: string): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    try {
      await navigator.clipboard.writeText(url);
      
      await trackShare('in_app');
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to copy link');
      console.error('Error copying link:', err);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [trackShare]);

  return {
    isSharing,
    isTracking,
    error,
    
    trackShare,
    trackClick,
    trackView,
    
    shareToWhatsApp,
    shareToFacebook,
    shareToTwitter,
    shareViaEmail,
    copyShareLink,
  };
};
