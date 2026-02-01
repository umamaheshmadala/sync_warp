import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import { ImageEditorModal } from '../common/ImageEditorModal';
import { Button } from '@/components/ui/button';
import { Edit2, Loader2, Eye, Camera, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface QuickImageUploaderProps {
    businessId: string;
    bucketName: string;
    imagePath: string; // The path/name of the file in storage (e.g., `logos/${businessId}.jpg`)
    currentImageUrl?: string | null;
    onUploadComplete: (publicUrl: string) => void;
    aspectRatio?: number;
    trigger?: React.ReactNode;
    maxSizeMB?: number; // Target size in MB (e.g., 0.4 for 400KB)
}

export function QuickImageUploader({
    businessId,
    bucketName,
    imagePath,
    currentImageUrl,
    onUploadComplete,
    aspectRatio = 1,
    trigger,
    maxSizeMB = 0.5, // Default 500KB
}: QuickImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setSelectedImageSrc(reader.result?.toString() || null);
                setIsEditorOpen(true);
            });
            reader.readAsDataURL(file);
        }
        // Reset input so same file can be selected again if needed
        event.target.value = '';
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentImageUrl) {
            // Load existing image into editor
            setSelectedImageSrc(currentImageUrl);
            setIsEditorOpen(true);
        } else {
            // Trigger file select if no existing image
            fileInputRef.current?.click();
        }
    };

    const handleViewClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentImageUrl) {
            setIsViewOpen(true);
        }
    };

    const handleEditorSave = async (croppedBlob: Blob) => {
        setIsUploading(true);
        try {
            // 1. Compress
            const compressionOptions = {
                maxSizeMB: maxSizeMB,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/jpeg',
            };

            // Convert Blob to File for compression lib
            const fileToCompress = new File([croppedBlob], 'image.jpg', { type: 'image/jpeg' });
            const compressedFile = await imageCompression(fileToCompress, compressionOptions);

            console.log(`Original size: ${croppedBlob.size / 1024} KB`);
            console.log(`Compressed size: ${compressedFile.size / 1024} KB`);

            // 2. Upload to Supabase
            // We append a timestamp to bypass CDN caching on immediate update
            const timestamp = new Date().getTime();

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(imagePath, compressedFile, {
                    upsert: true,
                    contentType: 'image/jpeg',
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(imagePath);

            // Add cache buster for immediate UI update
            const publicUrlWithCacheBuster = `${publicUrl}?t=${timestamp}`;

            onUploadComplete(publicUrlWithCacheBuster);

            toast.success("Image updated successfully.");

        } catch (error: any) {
            console.error(error);
            toast.error("Upload Failed: " + (error.message || "Could not upload image."));
        } finally {
            setIsUploading(false);
        }
    };

    // Helper to trigger file input from within modal if user wants to replace image
    const handleReplaceImage = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            {/* If custom trigger is provided, use it (wrapping click handler if needed) */}
            {trigger ? (
                <div onClick={(e) => {
                    // logic for custom trigger click
                    handleEditClick(e);
                }}>
                    {trigger}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    {/* View Button */}
                    {currentImageUrl && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                            onClick={handleViewClick}
                            type="button"
                            title="View Image"
                        >
                            <Eye className="h-4 w-4 text-gray-700" />
                        </Button>
                    )}

                    {/* Edit Button */}
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                        onClick={handleEditClick}
                        disabled={isUploading}
                        type="button"
                        title={currentImageUrl ? "Edit / Crop" : "Upload Image"}
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
                        ) : (
                            <Edit2 className="h-4 w-4 text-gray-700" />
                        )}
                    </Button>
                </div>
            )}

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />

            {/* Editor Modal */}
            {selectedImageSrc && (
                <ImageEditorModal
                    isOpen={isEditorOpen}
                    onClose={() => {
                        setIsEditorOpen(false);
                        setSelectedImageSrc(null);
                    }}
                    onSave={handleEditorSave}
                    imageSrc={selectedImageSrc}
                    aspectRatio={aspectRatio}
                    title={aspectRatio === 1 ? "Crop Logo" : "Crop Cover Photo"}
                    actions={
                        <Button variant="outline" size="sm" onClick={handleReplaceImage}>
                            <Camera className="mr-2 h-4 w-4" />
                            Replace Image
                        </Button>
                    }
                />
            )}

            {/* View Modal (Lightbox) */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center" aria-describedby={undefined}>
                    <DialogTitle className="sr-only">Image Preview</DialogTitle>
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full"
                            onClick={() => setIsViewOpen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                        {currentImageUrl && (
                            <img
                                src={currentImageUrl}
                                alt="View"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
