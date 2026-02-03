import React, { useEffect } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
// import { X } from 'lucide-react'; // Not using X explicitly as we have drag/back button
// import { Product } from '../../../types/product';

interface MobileProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const MobileProductModal: React.FC<MobileProductModalProps> = ({ isOpen, onClose, children }) => {
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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
                        className="relative w-full h-full sm:h-[90vh] sm:max-w-md sm:rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-2xl touch-none"
                    >
                        {/* Drag Handle for visual affordance */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full z-10 sm:hidden pointer-events-none" />

                        {/* Content Container - prevent drag on content unless at top? 
                            For now simple drag on container works. 
                            Might need to stop propagation on scrollable area if issues arise.
                        */}
                        <div
                            className="h-full overflow-y-auto no-scrollbar bg-white dark:bg-gray-900"
                            onPointerDown={(e) => e.stopPropagation()} // Optional: test if this blocks drag start on content
                        // Actually we WANT to drag title/header to close, but maybe not if scrolling mid-content?
                        // Framer motion drag is smart enough usually.
                        >
                            {children}
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
