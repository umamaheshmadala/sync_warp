import React, { useState } from 'react';
import { useProductWizardStore } from '../../../../stores/useProductWizardStore';
import { useProductDraft } from '../../../../hooks/useProductDraft';
import { useProducts } from '../../../../hooks/useProducts';
import { ArrowLeft, Share, Save, Loader2, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProductDescriptionInput } from '../ProductDescriptionInput';
import { ProductTagSelector } from '../ProductTagSelector';
import { ProductNotificationToggle } from '../../controls/ProductNotificationToggle';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../../store/authStore';

// Simple Image Carousel for Preview
const ImagePreviewCarousel = ({ images }: { images: any[] }) => {
    return (
        <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative group">
            <div className="flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide">
                {images.map((img, idx) => (
                    <div key={img.id} className="min-w-full h-full snap-center flex items-center justify-center bg-black">
                        <img src={img.preview || img.url} alt={`Preview ${idx}`} className="h-full object-contain" />
                    </div>
                ))}
            </div>
            {/* Simple dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {images.map((_, idx) => (
                    <div key={idx} className="w-2 h-2 rounded-full bg-white/50" />
                ))}
            </div>
        </div>
    );
};

export const ProductDetailsStep: React.FC = () => {
    const {
        setStep, images, name, description, tags, notificationsEnabled,
        updateDetails, draftId, closeWizard, reset, businessId
    } = useProductWizardStore();

    const { saveDraft, isLoading: isSavingDraft } = useProductDraft();
    const { createProduct, uploadProductImage } = useProducts();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isPublishing, setIsPublishing] = useState(false);

    // Validation
    const validate = () => {
        if (!name.trim()) {
            toast.error("Product name is required");
            return false;
        }
        if (images.length === 0) {
            toast.error("At least one image is required");
            return false;
        }
        return true;
    };

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        let completed = 0;

        for (const img of images) {
            // If it's already a remote URL (from draft/edit), keep it
            if (img.url.startsWith('http') && !img.url.startsWith('blob:')) {
                uploadedUrls.push(img.url);
                completed++;
                continue;
            }

            // If it's a blob/file, upload it
            try {
                // We need a File object. 
                // img.file is optional but if we came from picker we might have it.
                // If not (e.g. from blob URL only), we need to fetch blob.
                let fileToUpload: File;

                if (img.file) {
                    fileToUpload = img.file;
                } else {
                    const response = await fetch(img.url);
                    const blob = await response.blob();
                    fileToUpload = new File([blob], `image-${uuidv4()}.jpg`, { type: blob.type });
                }

                // Upload
                const publicUrl = await uploadProductImage(fileToUpload, businessId || undefined);
                if (publicUrl) {
                    uploadedUrls.push(publicUrl);
                } else {
                    throw new Error('Upload failed');
                }
            } catch (e) {
                console.error('Failed to upload image:', img.id, e);
                toast.error('Failed to upload one or more images');
                return []; // Fail hard or partial? Let's fail hard to prevent broken products
            }

            completed++;
            setUploadProgress(Math.round((completed / images.length) * 100));
        }

        return uploadedUrls;
    };

    const handleSaveDraft = async () => {
        if (!businessId) {
            toast.error("Business ID missing");
            return;
        }

        // For draft, we ideally upload images too, BUT for speed we might skip or just use what we have?
        // If we don't upload, the draft is only valid on this device (if using blob logic locally persisted in IndexedDB, but localStorage can't hold blobs).
        // WE MUST UPLOAD for robust drafts.
        const uploadedUrls = await uploadImages();
        if (uploadedUrls.length !== images.length) return; // Upload failed

        // Update images with real URLs
        const imagesWithUrls = images.map((img, i) => ({
            ...img,
            url: uploadedUrls[i],
            file: undefined // Clear file obj
        }));

        await saveDraft({
            draftId,
            images: imagesWithUrls, // Use persistent URLs
            name,
            description,
            tags,
            notificationsEnabled,
            businessId
        });

        closeWizard();
        reset();
    };

    const handlePublish = async () => {
        if (!validate()) return;
        setIsPublishing(true);
        setUploadProgress(0);

        try {
            // 1. Upload Images
            const uploadedUrls = await uploadImages();
            if (uploadedUrls.length !== images.length) {
                throw new Error("Image upload failed");
            }

            // 2. Create Product
            await createProduct({
                name,
                description,
                tags,
                is_available: true,
                is_featured: false,
                category: 'Uncategorized',
                price: 0,
                currency: 'INR',
                display_order: 0,
                image_urls: uploadedUrls,
            }, businessId!);

            // 3. Success
            toast.success("Product published!");
            closeWizard();
            reset();

            // Force refresh logic is needed here if hooks are disconnected.
            // Dispatch a window event that BusinessProductsTab listens to.
            window.dispatchEvent(new CustomEvent('product-created', { detail: { businessId } }));

        } catch (error) {
            console.error(error);
            toast.error("Failed to publish product");
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="h-16 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 shrink-0">
                <button onClick={() => setStep('edit')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
                <h1 className="font-semibold text-lg text-gray-900 dark:text-white">New Product</h1>
                <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-primary text-white px-4 py-1.5 rounded-full font-medium text-sm hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    {isPublishing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{uploadProgress}%</span>
                        </div>
                    ) : 'Share'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col md:flex-row gap-8">

                    {/* Preview Section (Mobile: Top, Web: Left) */}
                    <div className="w-full md:w-1/2 max-w-sm mx-auto md:mx-0">
                        <ImagePreviewCarousel images={images} />
                        <div className="mt-4 flex justify-center">
                            <button onClick={() => setStep('edit')} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white underline">
                                Edit images
                            </button>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="w-full md:w-1/2 space-y-6">

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => updateDetails({ name: e.target.value })}
                                maxLength={100}
                                placeholder="e.g., Summer Floral Dress"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            <div className="flex justify-end mt-1">
                                <span className="text-xs text-gray-400">{name.length}/100</span>
                            </div>
                        </div>

                        {/* Description */}
                        <ProductDescriptionInput
                            value={description}
                            onChange={(e) => updateDetails({ description: e.target.value })}
                        />

                        {/* Tags */}
                        <ProductTagSelector
                            selectedTags={tags}
                            onChange={(newTags) => updateDetails({ tags: newTags })}
                        />

                        {/* Notification Toggle */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                            <ProductNotificationToggle
                                isEnabled={notificationsEnabled}
                                onToggle={(val) => updateDetails({ notificationsEnabled: val })}
                                productId="new" // Virtual ID for UI
                                isOwner={true}
                            />
                        </div>

                        {/* Save Draft */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={handleSaveDraft}
                                disabled={isSavingDraft || isPublishing}
                                className="w-full py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {isSavingDraft ? 'Saving Draft...' : 'Save as Draft'}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
