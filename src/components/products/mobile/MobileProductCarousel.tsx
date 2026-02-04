import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Product } from '../../../types/product';

interface MobileProductCarouselProps {
    images: (string | { url: string; alt?: string })[];
    productName: string;
    onDoubleTap?: () => void;
}

export const MobileProductCarousel: React.FC<MobileProductCarouselProps> = ({
    images,
    productName,
    onDoubleTap
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showHeart, setShowHeart] = useState(false);

    // Filter valid images only and normalize to object structure
    const validImages = useMemo(() => {
        if (!images || images.length === 0) {
            return [{ url: 'https://placehold.co/1080x1350?text=No+Image', alt: 'Placeholder' }];
        }
        return images.map(img => {
            if (typeof img === 'string') {
                return { url: img, alt: productName };
            }
            return img;
        });
    }, [images, productName]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const scrollLeft = scrollRef.current.scrollLeft;
            const width = scrollRef.current.offsetWidth;
            const index = Math.round(scrollLeft / width);
            setCurrentIndex(index);
        }
    };

    const handleDoubleTap = (e: React.MouseEvent) => {
        // Prevent default zoom if any
        e.preventDefault();

        // Trigger heart animation
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);

        if (onDoubleTap) {
            onDoubleTap();
        }
    };

    return (
        <div className="relative w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800">
            {/* Carousel Container */}
            <div
                ref={scrollRef}
                className="w-full h-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory no-scrollbar"
                onScroll={handleScroll}
                style={{ scrollBehavior: 'smooth' }}
            >
                {validImages.map((img, idx) => (
                    <div
                        key={idx}
                        className="w-full h-full flex-shrink-0 snap-center relative"
                        onDoubleClick={handleDoubleTap}
                    >
                        <img
                            src={img.url}
                            alt={img.alt || productName}
                            className="w-full h-full object-cover"
                            draggable={false}
                            loading={idx === 0 ? "eager" : "lazy"}
                        />
                        {/* Sold out overlay could go here if mapped from props */}
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            {validImages.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {validImages.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx
                                ? 'bg-white w-2 h-2 shadow-sm'
                                : 'bg-white/50'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Heart Animation Overlay */}
            <AnimatePresence>
                {showHeart && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
