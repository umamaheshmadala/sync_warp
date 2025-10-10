// src/components/ads/AdSlot.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp } from 'lucide-react';
import type { AdSlotData } from '../../types/ads';

interface AdSlotProps {
  slot: AdSlotData;
  onAdClick: (adId: string) => void;
  onImpression: (adId: string) => void;
}

const AdSlot: React.FC<AdSlotProps> = ({ slot, onAdClick, onImpression }) => {
  const content = slot.ad || slot.organic;
  const isOrganic = slot.content_type === 'organic';

  // Track impression on mount
  React.useEffect(() => {
    if (slot.ad) {
      onImpression(slot.ad.id);
    }
  }, [slot.ad, onImpression]);

  const handleClick = () => {
    if (slot.ad) {
      onAdClick(slot.ad.id);
      // Navigate to CTA URL
      if (slot.ad.cta_url) {
        window.location.href = slot.ad.cta_url;
      }
    } else if (slot.organic) {
      window.location.href = slot.organic.cta_url;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Organic Label */}
      {isOrganic && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Recommended
          </span>
        </div>
      )}

      {/* Promoted Label */}
      {!isOrganic && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
            ✨ Sponsored
          </span>
        </div>
      )}

      <button
        onClick={handleClick}
        className="w-full bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
      >
        {/* Image Section */}
        <div className="h-48 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative flex items-center justify-center">
          {content?.image_url ? (
            <img 
              src={content.image_url} 
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <TrendingUp className="w-16 h-16 text-indigo-400" />
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
            {content?.title}
          </h3>
          {content?.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {content.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-600 font-medium">
              {content?.cta_text || 'Learn More'}
            </span>
            <ExternalLink className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
      </button>
    </motion.div>
  );
};

export default AdSlot;
