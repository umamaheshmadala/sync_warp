import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProductViewTracking } from '../../../hooks/useProductAnalytics';

interface MobileProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const MobileProductModal: React.FC<MobileProductModalProps> = ({ isOpen, onClose, children }) => {
    const [yOffset, setYOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const startY = useRef<number | null>(null);

    // Reset animation when opening
    useEffect(() => {
        if (isOpen) {
            setYOffset(0);
            setIsClosing(false);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Wait for CSS transition
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY.current === null) return;
        const deltaY = e.touches[0].clientY - startY.current;
        if (deltaY > 0) { // Only allow dragging down
            setYOffset(deltaY);
        }
    };

    const handleTouchEnd = () => {
        if (yOffset > 100) {
            handleClose();
        } else {
            setYOffset(0); // Snap back
        }
        setIsDragging(false);
        startY.current = null;
    };

    if (!isOpen && !isClosing) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'animate-fadeIn'}`}
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full h-full sm:h-[90vh] sm:max-w-md sm:rounded-xl bg-white overflow-hidden shadow-2xl touch-none ${isClosing ? 'translate-y-full transition-transform duration-300' :
                    (isDragging ? 'transition-none' : 'animate-fadeInUp transition-transform duration-300')
                    }`}
                style={isDragging || (!isClosing && yOffset > 0) ? { transform: `translateY(${yOffset}px)` } : undefined}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle for visual affordance */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full z-10 sm:hidden pointer-events-none"
                    style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
                />

                {/* Content Container */}
                <div
                    className="h-full overflow-y-auto no-scrollbar bg-white"
                    onTouchStart={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
                        {children}
                    </div>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
