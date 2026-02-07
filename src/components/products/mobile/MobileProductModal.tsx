import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
import { useProductViewTracking } from '../../../hooks/useProductAnalytics';
// import { X } from 'lucide-react'; // Not using X explicitly as we have drag/back button
// import { Product } from '../../../types/product';

interface MobileProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const MobileProductModal: React.FC<MobileProductModalProps> = ({ isOpen, onClose, children }) => {
    // Analytics: Track view
    // Note: 'product.id' is not directly available in props here (children driven), 
    // but looking at BusinessProductsTab, it renders specific modal for product.
    // Wait, the interface here is generic 'children'. 
    // The previous view showed: `children: React.ReactNode;`. 
    // I need to check how to get ID. It seems MobileProductModal is a WRAPPER.
    // I should check `BusinessProductsTab` or where `MobileProductDetails` is used.
    // Let me REVERT this plan and check usage first.

    // Actually, looking at the previous failed attempt's context, I assumed it had 'product' prop.
    // Step 3979 view shows it only has 'children'.
    // So generic tracking on this wrapper is hard without ID.
    // I should move tracking to `MobileProductDetails` or `BusinessProductsTab`.

    // Let's abort this specific edit and re-evaluate placement.
    const controls = useAnimation();

    // Reset animation when opening
    useEffect(() => {
        if (isOpen) {
            controls.start({ y: 0, opacity: 1 });
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Unlock body scroll
            document.body.style.overflow = '';
        }
        return () => {
            // Safety cleanup
            document.body.style.overflow = '';
        };
    }, [isOpen, controls]);

    // Handle drag end
    const handleDragEnd = (event: any, info: PanInfo) => {
        // Close if dragged down sufficiently (100px or fast swipe)
        if (info.offset.y > 100 || info.velocity.y > 0.5) {
            controls.start({ y: '100%' }).then(onClose);
        } else {
            // Snap back
            controls.start({ y: 0 });
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }} // Constraints are 0 to allow movement but snap back
                        dragElastic={{ top: 0, bottom: 0.5 }} // Pull down easily (0.5), hard stop up (0)
                        onDragEnd={handleDragEnd}
                        initial={{ y: '100%' }}
                        animate={controls}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full h-full sm:h-[90vh] sm:max-w-md sm:rounded-xl bg-white overflow-hidden shadow-2xl touch-none"
                    >
                        {/* Drag Handle for visual affordance */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full z-10 sm:hidden pointer-events-none" />

                        {/* Content Container */}
                        <div
                            className="h-full overflow-y-auto no-scrollbar bg-white"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="pt-14">
                                {children}
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};
