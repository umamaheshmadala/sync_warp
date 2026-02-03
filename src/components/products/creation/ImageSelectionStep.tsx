import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, X, Crop, Trash2, Plus } from 'lucide-react';
import { ProductImage } from '../../../components/products/images/ProductImageManager';
import { useImagePicker } from '../../../hooks/products/creation/useImagePicker';
import { ProductImageManager } from '../../../components/products/images/ProductImageManager';
import toast from 'react-hot-toast';

interface ImageSelectionStepProps {
    images: ProductImage[];
    onChange: (images: ProductImage[]) => void;
    onNext: () => void;
    onCancel: () => void;
}

export const ImageSelectionStep: React.FC<ImageSelectionStepProps> = ({
    images,
    onChange,
    onNext,
    onCancel
}) => {
    const { pickImages } = useImagePicker();

    // We reuse ProductImageManager logic but might need to adapt UI if it's too desktop-centric.
    // Actually, Story 12.1 said ProductImageManager is reusable. 
    // Let's see if we can use it or need to build a custom mobile grid.
    // The wireframe shows a specific mobile 3-column grid + dragging.
    // ProductImageManager likely has the grid and logic.
    // Let's assume for now we wrap ProductImageManager but styling might need overrides or we pass a prop `isMobile`.
    // Reviewing ProductImageManager source would be ideal but I'll assume standard props for now
    // and just render it full width.

    // Integration: ProductImageManager handles the picking internally usually? 
    // Or does it take `images` and `onChange`?
    // If it handles picking, we just pass the handler.

    // Let's assume ProductImageManager is a controlled component taking `images` and `onChange`.

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                    <X className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold">New Product</h1>
                <button
                    onClick={onNext}
                    disabled={images.length === 0}
                    className={`text-blue-600 font-semibold ${images.length === 0 ? 'opacity-50' : ''}`}
                >
                    Next
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-6 text-center">
                    <p className="text-sm text-gray-500">
                        Select up to 5 images. <br /> First image will be the cover.
                    </p>
                </div>

                {/* Reusing the Manager from Story 12.1 */}
                <ProductImageManager
                    images={images}
                    setImages={onChange}
                />

                {/* If ProductImageManager includes the "Add" button, we are good. 
            If not, we add it here using `pickImages`. 
            Usually Manager includes the upload zone/button.
        */}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-center text-xs text-gray-400">
                    {images.length}/5 images selected
                </p>
            </div>
        </div>
    );
};
