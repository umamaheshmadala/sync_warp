import React, { useState, useCallback } from 'react';
import { Area } from 'react-easy-crop';
import { toast } from 'react-hot-toast';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageCropper } from './ImageCropper';
import { ImagePreviewList } from './ImagePreviewList';
import { imageCompressionService } from '@/services/imageCompressionService';
import { productService } from '@/services/productService'; // Assuming we created this
import getCroppedImg from '../../../lib/cropImageUtils'; // Use relative path to avoid aliases issues
// Need a way to generate unique ID for internal tracking
const generateId = () => Math.random().toString(36).substr(2, 9);

export interface ProductImage {
    id: string; // Internal ID for drag/drop
    file: File;
    previewUrl: string; // For display
    croppedBlob?: Blob; // If cropped
    uploadUrl?: string; // Once uploaded
}

interface ProductImageManagerProps {
    images: ProductImage[];
    setImages: React.Dispatch<React.SetStateAction<ProductImage[]>>;
    businessId?: string; // Required for upload
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
    images,
    setImages,
    businessId
}) => {
    // Cropper State
    const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);

    // Add new files
    const handleImagesSelected = async (files: File[]) => {
        const newImages: ProductImage[] = [];

        for (const file of files) {
            // Compress initial file if needed? Or wait until save?
            // Let's create preview first
            const previewUrl = URL.createObjectURL(file);
            newImages.push({
                id: generateId(),
                file,
                previewUrl
            });
        }

        setImages(prev => [...prev, ...newImages]);

        // Auto-open cropper for first new image if it's the only one and list was empty?
        // Requirement doesn't strict auto-open, but "User uploads and crops". 
        // Let's let them click edit to crop, OR auto-crop the first one. 
        // For now, simple list update.
    };

    // Remove
    const handleRemove = (id: string) => {
        setImages(prev => {
            const newImages = prev.filter(img => img.id !== id);
            // Cleanup object URLs? (useEffect is better for this but manual is ok)
            return newImages;
        });
    };

    // Reorder
    const handleReorder = (newOrder: ProductImage[]) => {
        // Update full state based on new order of IDs
        setImages(newOrder);
    };

    // Open Cropper
    const handleEdit = (image: ProductImage) => {
        setCroppingImageId(image.id);
        setShowCropper(true);
    };

    // Save Crop
    const handleCropComplete = async (croppedAreaPixels: Area, rotation: number) => {
        if (!croppingImageId) return;

        const imageToCrop = images.find(img => img.id === croppingImageId);
        if (!imageToCrop) return;

        try {
            // Use utility to generate cropped blob (need to implement/ensure existence)
            const croppedBlob = await getCroppedImg(imageToCrop.previewUrl, croppedAreaPixels, rotation);

            // Convert blob to file for consistency? Or store blob.
            // Let's store blob in state
            // Create new preview URL
            const newPreviewUrl = URL.createObjectURL(croppedBlob);

            setImages(prev => prev.map(img => {
                if (img.id === croppingImageId) {
                    return {
                        ...img,
                        croppedBlob: croppedBlob,
                        previewUrl: newPreviewUrl // Update preview to show cropped version
                    };
                }
                return img;
            }));

            setShowCropper(false);
            setCroppingImageId(null);

        } catch (e) {
            console.error(e);
            toast.error("Failed to crop image");
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
            <div className="text-sm text-gray-500 mb-4">
                Add up to 5 images. Tap an image to crop (4:5 ratio).
            </div>

            <ImageUploadZone
                onImagesSelected={handleImagesSelected}
                currentFilesCount={images.length}
                maxFiles={5}
                disabled={images.length >= 5}
            />

            {images.length > 0 && (
                <ImagePreviewList
                    images={images}
                    onReorder={handleReorder}
                    onRemove={handleRemove}
                    onEdit={handleEdit}
                />
            )}

            {/* Cropper Modal */}
            {showCropper && croppingImageId && (
                <ImageCropper
                    isOpen={showCropper}
                    onClose={() => setShowCropper(false)}
                    imageSrc={images.find(img => img.id === croppingImageId)?.previewUrl || ''}
                    onCropComplete={handleCropComplete}
                />
            )}
        </div>
    );
};
