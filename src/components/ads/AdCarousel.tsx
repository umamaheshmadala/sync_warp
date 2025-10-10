// src/components/ads/AdCarousel.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AdSlot from './AdSlot';
import { useAdSlots } from '../../hooks/useAdSlots';

const AdCarousel: React.FC = () => {
  const { slots, loading, trackImpression, trackClick } = useAdSlots();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!autoplay || slots.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slots.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoplay, slots.length]);

  const goToPrevious = () => {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev - 1 + slots.length) % slots.length);
  };

  const goToNext = () => {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev + 1) % slots.length);
  };

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
    );
  }

  if (slots.length === 0) {
    return null; // Or show fallback content
  }

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <AdSlot
              slot={slots[currentIndex]}
              onAdClick={trackClick}
              onImpression={trackImpression}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {slots.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
              aria-label="Previous ad"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
              aria-label="Next ad"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Indicators */}
      {slots.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {slots.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoplay(false);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-indigo-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdCarousel;
