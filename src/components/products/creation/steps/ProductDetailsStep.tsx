import React, { useState } from 'react';
import { useProductWizardStore } from '../../../../stores/useProductWizardStore';
import { useProductDraft } from '../../../../hooks/products/useProductDraft';
import { useProducts } from '../../../../hooks/useProducts';
import { ArrowLeft, Share, Save, Loader2, Info, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProductDescriptionInput } from '../ProductDescriptionInput';
import { ProductTagSelector } from '../ProductTagSelector';
import { ProductNotificationToggle } from '../../controls/ProductNotificationToggle';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../../store/authStore';
import imageCompression from 'browser-image-compression';

// Simple Image Carousel for Preview
const ImagePreviewCarousel = ({ images }: { images: any[] }) => {
    const [activeIndex, setActiveIndex] = React.useState(0);

    const next = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % images.length);
    };

    const prev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // Auto-scroll the container
    React.useEffect(() => {
        const container = document.getElementById('preview-carousel-container');
        if (container) {
            container.scrollTo({
                left: activeIndex * container.clientWidth,
                behavior: 'smooth'
            });
        }
    }, [activeIndex]);

    return (
        <div className="w-full aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden relative group">
            <div id="preview-carousel-container" className="flex overflow-x-hidden h-full scrollbar-hide snap-x snap-mandatory">
                {images.map((img, idx) => (
                    <div key={img.id} className="min-w-full h-full snap-center flex items-center justify-center bg-black">
                        <img src={img.preview || img.url} alt={`Preview ${idx}`} className="h-full object-contain" />
                    </div>
                ))}
            </div>

            {/* Arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10 opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10 opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Simple dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {images.map((_, idx) => (
                    <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === activeIndex ? 'bg-white' : 'bg-white/40'}`}
                    />
                ))}
            </div>
        </div>
    );
};

import { DiscardDialog } from '../DiscardDialog';

export const ProductDetailsStep: React.FC = () => {
    const {
        setStep, images, name, description, tags, notificationsEnabled,
        updateDetails, draftId, closeWizard, reset, businessId,
        editMode, editingProductId
    } = useProductWizardStore();

    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const { saveDraft, saving: isSavingDraft } = useProductDraft();
    const { createProduct, updateProduct, uploadProductImage } = useProducts(businessId);
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
            // Determine the source URL: use preview (cropped) if available, otherwise original url
            const sourceUrl = img.preview || img.url;

            // If it's a remote URL and NOT a blob (meaning it's already uploaded and untouched), keep it
            if (sourceUrl.startsWith('http') && !sourceUrl.startsWith('blob:')) {
                uploadedUrls.push(sourceUrl);
                completed++;
                continue;
            }

            // If it's a blob/file, upload it
            try {
                let fileToUpload: File;

                // 1. Get the File object (or blob from URL)
                if (img.file && !img.preview) {
                    fileToUpload = img.file;
                } else {
                    // Fetch blob from URL
                    const response = await fetch(sourceUrl);
                    const blob = await response.blob();
                    fileToUpload = new File([blob], `image-${uuidv4()}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
                }

                // 2. Compress/Convert to JPEG (Fixes AVIF and size issues)
                console.log('Compressing image...', fileToUpload.name);
                const compressedFile = await imageCompression(fileToUpload, {
                    maxSizeMB: 1, // 1MB max
                    maxWidthOrHeight: 1920, // HD
                    useWebWorker: true,
                    fileType: 'image/jpeg' // Force JPEG
                });

                // Rename to .jpg and create new File object
                const finalFile = new File([compressedFile], fileToUpload.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });

                // Upload
                const publicUrl = await uploadProductImage(finalFile, draftId || undefined);
                if (publicUrl) {
                    uploadedUrls.push(publicUrl);
                } else {
                    throw new Error('Upload failed');
                }
            } catch (e) {
                console.error('Failed to upload image:', img.id, e);
                toast.error('Failed to upload one or more images');
                return [];
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

        // Use the hook's save capability which handles everything
        await saveDraft();

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

            // 2. Create or Update Product
            if (editMode && editingProductId) {
                await updateProduct(editingProductId, {
                    name,
                    description,
                    tags,
                    // Preserve existing values for fields not in wizard if needed, but here we just update what we have
                    is_available: true,
                    image_urls: uploadedUrls,
                });
                toast.success("Product updated!");
            } else {
                await createProduct({
                    name,
                    description,
                    tags,
                    is_available: true,
                    is_featured: false,
                    currency: 'INR',
                    display_order: 0,
                    image_urls: uploadedUrls,
                }, businessId!);
                toast.success("Product published!");
            }

            // 3. Success
            closeWizard();
            reset();

            window.dispatchEvent(new CustomEvent('product-created', { detail: { businessId } }));

        } catch (error) {
            console.error(error);
            toast.error(editMode ? "Failed to update product" : "Failed to publish product");
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="h-16 flex items-center justify-between border-b border-gray-100 bg-white px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => setStep('edit')} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <button
                        onClick={() => setShowDiscardDialog(true)}
                        className="text-sm font-medium text-gray-500 hover:text-red-600 px-2 transition-colors hidden sm:block"
                    >
                        Discard
                    </button>
                    <DiscardDialog
                        open={showDiscardDialog}
                        onOpenChange={setShowDiscardDialog}
                        onConfirm={() => {
                            closeWizard();
                            reset();
                        }}
                        title={editMode ? "Discard unsaved changes?" : "Discard product creation?"}
                        description={editMode ? "All unsaved changes will be lost." : "Are you sure you want to stop creating this product? All progress will be lost."}
                    />
                </div>

                <h1 className="font-semibold text-lg text-gray-900 truncate max-w-[200px]">
                    {editMode && name ? name : 'New Product'}
                </h1>

                <div className="flex items-center gap-2">
                    {/* Mobile Cancel Icon */}
                    <button
                        onClick={() => setShowDiscardDialog(true)}
                        className="sm:hidden p-2 hover:bg-gray-100 rounded-full text-gray-500"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="bg-black text-white px-4 py-1.5 rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
                    >
                        {isPublishing ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{uploadProgress}%</span>
                            </div>
                        ) : (editMode ? 'Save Changes' : 'Publish')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-4xl mx-auto w-full min-h-full p-4 md:p-8 flex flex-col md:flex-row gap-8 items-start">

                    {/* Preview Section (Mobile: Top, Web: Left) */}
                    <div className="w-full md:w-1/2 max-w-sm mx-auto md:mx-0">
                        <ImagePreviewCarousel images={images} />
                        <div className="mt-4 flex justify-center">
                            <button onClick={() => setStep('edit')} className="text-sm text-gray-500 hover:text-gray-900 underline">
                                Edit images
                            </button>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="w-full md:w-1/2 space-y-6">

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => updateDetails({ name: e.target.value })}
                                maxLength={100}
                                placeholder="e.g., Summer Floral Dress"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <ProductNotificationToggle
                                isEnabled={notificationsEnabled}
                                onToggle={(val) => updateDetails({ notificationsEnabled: val })}
                                productId="new" // Virtual ID for UI
                                isOwner={true}
                            />
                        </div>

                        {/* Save Draft - Only for new products */}
                        {!editMode && (
                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={isPublishing}
                                    className="w-full py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingDraft ? 'Saving Draft...' : 'Save as Draft'}
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div >
    );
};
