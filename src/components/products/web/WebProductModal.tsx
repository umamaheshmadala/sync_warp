import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Product } from '../../../types/product';
import { WebProductCarousel } from './WebProductCarousel';
import { WebProductDetailsPanel } from './WebProductDetailsPanel';
import { useProductViewTracking } from '../../../hooks/useProductAnalytics';

interface WebProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    isOwner: boolean;
    onArchive?: (productId: string) => Promise<boolean>;
    onUnarchive?: (productId: string) => Promise<boolean>;
    onDelete?: (productId: string) => Promise<boolean>;
}

export const WebProductModal: React.FC<WebProductModalProps> = ({
    isOpen,
    onClose,
    product,
    isOwner,
    onArchive,
    onUnarchive,
    onDelete
}) => {
    // Analytics: Track view
    useProductViewTracking(isOpen ? product.id : undefined);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Reset index when product changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [product.id]);

    // Handle Keyboard Navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        // Image List normalization (same potential logic as Carousel, but simple count check is enough here)
        const imageCount = (product.images || []).length || (product.image_url ? 1 : 0);

        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowLeft') {
            setCurrentImageIndex(prev => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight') {
            setCurrentImageIndex(prev => Math.min(imageCount - 1, prev + 1));
        }
    }, [isOpen, onClose, product]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '15px'; // Prevent layout shift (scrollbar width approx)
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                >
                    {/* Close Button (floating top right) */}
                    <button
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </motion.div>

                {/* Modal Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
                    className="relative w-full max-w-6xl h-[85vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-2xl flex flex-row"
                >
                    {/* Left: Image Carousel (65% width) */}
                    <div className="w-[60%] lg:w-[65%] h-full bg-black relative group">
                        <WebProductCarousel
                            images={product.images || (product.image_url ? [product.image_url] : [])}
                            currentIndex={currentImageIndex}
                            onChangeIndex={setCurrentImageIndex}
                            productName={product.name}
                        />
                    </div>

                    {/* Right: Details Panel (35% width) */}
                    <div className="w-[40%] lg:w-[35%] h-full">
                        <WebProductDetailsPanel
                            product={product}
                            isOwner={isOwner}
                            onClose={onClose}
                            onArchive={onArchive}
                            onUnarchive={onUnarchive}
                            onDelete={onDelete}
                        />
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};
