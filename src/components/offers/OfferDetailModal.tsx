// OfferDetailModal.tsx
// Modal to display full offer details

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Share2,
  Eye,
  MousePointerClick,
  Tag,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import type { Offer } from '../../types/offers';
import { Button } from '@/components/ui/button';
import { OfferShareButton } from '../Sharing/OfferShareButton';

interface OfferDetailModalProps {
  offer: Offer;
  onClose: () => void;
  onShare?: (offer: Offer) => void;
  showStats?: boolean;
}

export const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  offer,
  onClose,
  onShare,
  showStats = false,
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{offer.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Code: <span className="font-mono font-semibold text-indigo-600">{offer.offer_code}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Icon/Image */}
              {offer.icon_image_url ? (
                <div className="flex justify-center">
                  <img
                    src={offer.icon_image_url}
                    alt={offer.title}
                    className="w-32 h-32 rounded-xl object-cover"
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <Tag className="w-16 h-16 text-indigo-600" />
                  </div>
                </div>
              )}

              {/* Description */}
              {offer.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{offer.description}</p>
                </div>
              )}

              {/* Validity Period */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Validity Period
                </h3>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>
                    {format(new Date(offer.valid_from), 'MMMM d, yyyy')} - {format(new Date(offer.valid_until), 'MMMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Valid until {format(new Date(offer.valid_until), 'MMMM d, yyyy')}
                </p>
              </div>

              {/* Terms & Conditions */}
              {offer.terms_conditions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Terms & Conditions
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {offer.terms_conditions}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats (if enabled) */}
              {showStats && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Eye className="w-5 h-5 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-900">{offer.view_count}</span>
                      </div>
                      <span className="text-xs text-blue-700 font-medium">Views</span>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Share2 className="w-5 h-5 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-900">{offer.share_count}</span>
                      </div>
                      <span className="text-xs text-purple-700 font-medium">Shares</span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <MousePointerClick className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-900">{offer.click_count}</span>
                      </div>
                      <span className="text-xs text-green-700 font-medium">Clicks</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              {/* Share Button (New Story 10.1.4) */}
              <OfferShareButton
                offerId={offer.id}
                offerTitle={offer.title}
                offerDescription={offer.description}
                validUntil={offer.valid_until}
                offerImage={offer.icon_image_url}
                businessId={offer.business_id}
                businessName={offer.business?.business_name || 'Sync Business'}
                variant="default" // Using default (solid color) for prominence
                size="default"
                showLabel={true}
                label="Share This Offer"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              /></div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfferDetailModal;
