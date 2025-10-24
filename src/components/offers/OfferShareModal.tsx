// =====================================================
// Story 4.12: Business Offers Management
// Component: OfferShareModal - Share offers modal
// =====================================================

import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  Mail, 
  Copy,
  Check
} from 'lucide-react';
import { useOfferShare } from '../../hooks/useOfferShare';
import type { Offer } from '../../types/offers';

interface OfferShareModalProps {
  offer: Offer;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OfferShareModal({
  offer,
  userId,
  isOpen,
  onClose,
}: OfferShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  const {
    isSharing,
    error,
    shareToWhatsApp,
    shareToFacebook,
    shareToTwitter,
    shareViaEmail,
    copyShareLink,
  } = useOfferShare({
    offerId: offer.id,
    businessId: offer.business_id,
    userId,
  });

  if (!isOpen) return null;

  // Generate share URL (you'll need to update this with your actual domain)
  const shareUrl = `${window.location.origin}/offers/${offer.id}`;

  // Generate share message
  const shareMessage = `Check out this offer: ${offer.title}\n${offer.description || ''}\nCode: ${offer.offer_code}\n${shareUrl}`;

  const handleCopyLink = async () => {
    const success = await copyShareLink(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    shareToWhatsApp(shareMessage);
  };

  const handleFacebookShare = () => {
    shareToFacebook(shareUrl);
  };

  const handleTwitterShare = () => {
    const tweetText = `🎉 ${offer.title}\n💰 ${offer.description || 'Limited time offer!'}\n🔥 Code: ${offer.offer_code}`;
    shareToTwitter(tweetText, shareUrl);
  };

  const handleEmailShare = () => {
    const emailSubject = `Special Offer: ${offer.title}`;
    const emailBody = `Hi,\n\nI wanted to share this exclusive offer with you:\n\n${offer.title}\n${offer.description || ''}\n\nUse code: ${offer.offer_code}\n\nValid until: ${new Date(offer.valid_until).toLocaleDateString()}\n\nCheck it out: ${shareUrl}\n\nEnjoy!`;
    shareViaEmail(emailSubject, emailBody);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Offer</h2>
              <p className="text-sm text-gray-500">Spread the word!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Offer Preview */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-start gap-4">
            {offer.icon_image_url ? (
              <img
                src={offer.icon_image_url}
                alt={offer.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                <Share2 className="w-8 h-8 text-purple-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {offer.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Code: <span className="font-mono font-semibold text-purple-600">{offer.offer_code}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="p-6">
          <div className="space-y-3">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              disabled={isSharing}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">WhatsApp</p>
                <p className="text-sm text-gray-500">Share with friends</p>
              </div>
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebookShare}
              disabled={isSharing}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Facebook className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Facebook</p>
                <p className="text-sm text-gray-500">Post on your timeline</p>
              </div>
            </button>

            {/* Twitter */}
            <button
              onClick={handleTwitterShare}
              disabled={isSharing}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-sky-50 hover:border-sky-300 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                <Twitter className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Twitter</p>
                <p className="text-sm text-gray-500">Tweet this offer</p>
              </div>
            </button>

            {/* Email */}
            <button
              onClick={handleEmailShare}
              disabled={isSharing}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Email</p>
                <p className="text-sm text-gray-500">Send via email</p>
              </div>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              disabled={isSharing}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                {copied ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <Copy className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">
                  {copied ? 'Link Copied!' : 'Copy Link'}
                </p>
                <p className="text-sm text-gray-500 truncate">{shareUrl}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfferShareModal;
