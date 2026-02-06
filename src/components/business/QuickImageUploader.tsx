import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import { ImageEditorModal } from '../common/ImageEditorModal';
import { Button } from '@/components/ui/button';
import { Edit2, Loader2, Eye, Camera, X, Trash2, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface QuickImageUploaderProps {
    businessId: string;
    bucketName: string;
    imageType: 'logo' | 'cover';
    folderPath: string; // Folder path (e.g. `business_images/{businessId}`)
    currentImageUrl?: string | null;
    onUploadComplete: (publicUrl: string) => void;
    onDelete?: () => void; // Soft delete callback
    aspectRatio?: number;
    trigger?: React.ReactNode;
    maxSizeMB?: number; // Target size in MB (e.g., 0.4 for 400KB)
}

export function QuickImageUploader({
    businessId,
    bucketName,
    imageType,
    folderPath,
    currentImageUrl,
    onUploadComplete,
    onDelete,
    aspectRatio = 1,
    trigger,
    maxSizeMB = 0.5, // Default 500KB
}: QuickImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyImages, setHistoryImages] = useState<{ name: string; url: string; created_at: string }[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'current' | 'history';
        item?: any;
    }>({ isOpen: false, type: 'current' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .list(folderPath, {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' },
                    search: `${imageType}_`
                });

            if (error) throw error;

            const images = data
                .filter(file => file.name.startsWith(`${imageType}_`)) // Double check prefix
                .map(file => {
                    const { data: { publicUrl } } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(`${folderPath}/${file.name}`);
                    return {
                        name: file.name,
                        url: publicUrl,
                        created_at: file.created_at,
                    };
                });

            setHistoryImages(images);
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("Could not load image history.");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const cleanupOldImages = async () => {
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .list(folderPath, {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' },
                    search: `${imageType}_`
                });

            if (error) throw error;

            // Retention Policy: Max 6 images + 1 current (roughly)
            // We keep the top 6 most recent.
            const verifiedFiles = data.filter(file => file.name.startsWith(`${imageType}_`));

            if (verifiedFiles.length > 6) {
                const filesToDelete = verifiedFiles.slice(6).map(f => `${folderPath}/${f.name}`);
                if (filesToDelete.length > 0) {
                    await supabase.storage
                        .from(bucketName)
                        .remove(filesToDelete);
                    console.log("Cleanup: Deleted old images:", filesToDelete);
                }
            }
        } catch (err) {
            console.error("Cleanup failed:", err);
            // Don't toast for cleanup failure, it's background maintenance
        }
    };

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

    const handleHistoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsHistoryOpen(true);
        fetchHistory();
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete && confirm("Are you sure you want to remove this image? It will be saved in history.")) {
            onDelete();
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

            // 2. Upload to Supabase with Unique Filename
            const timestamp = new Date().getTime();
            const uniqueFilename = `${imageType}_${timestamp}.jpg`;
            const fullPath = `${folderPath}/${uniqueFilename}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fullPath, compressedFile, {
                    upsert: false, // Should be unique
                    contentType: 'image/jpeg',
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fullPath);

            onUploadComplete(publicUrl);

            toast.success("Image updated successfully.");

            // 4. Cleanup old images (Background)
            cleanupOldImages();

        } catch (error: any) {
            console.error(error);
            toast.error("Upload Failed: " + (error.message || "Could not upload image."));
        } finally {
            setIsUploading(false);
            setIsEditorOpen(false); // Close editor after upload
        }
    };

    const performDelete = async () => {
        if (deleteConfirmation.type === 'current') {
            if (onDelete) onDelete();
            setIsEditorOpen(false);
            setDeleteConfirmation({ isOpen: false, type: 'current' });
        } else if (deleteConfirmation.type === 'history' && deleteConfirmation.item) {
            try {
                const img = deleteConfirmation.item;
                const path = `${folderPath}/${img.name}`;
                const { error } = await supabase.storage.from(bucketName).remove([path]);

                if (!error) {
                    setHistoryImages(prev => prev.filter(i => i.name !== img.name));
                    toast.success("Image deleted from history");
                } else {
                    toast.error("Failed to delete image");
                }
            } catch (error) {
                console.error("Error deleting image:", error);
                toast.error("Failed to delete image");
            } finally {
                setDeleteConfirmation({ isOpen: false, type: 'current' });
            }
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
                    handleEditClick(e);
                    fetchHistory();
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
                        onClick={(e) => {
                            handleEditClick(e);
                            fetchHistory();
                        }}
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
                    requireInteraction={selectedImageSrc === currentImageUrl}
                    actions={
                        <div className="flex items-center gap-2">
                            {currentImageUrl && onDelete && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteConfirmation({ isOpen: true, type: 'current' })}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={handleReplaceImage}>
                                <Camera className="mr-2 h-4 w-4" />
                                Upload
                            </Button>
                        </div>
                    }
                    footerContent={
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">History</h4>
                            <div className="grid grid-cols-6 gap-2 max-h-[120px] overflow-y-auto p-1 bg-gray-50 rounded-lg">
                                {isLoadingHistory ? (
                                    <div className="col-span-6 py-4 flex justify-center text-gray-500">
                                        <Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading...
                                    </div>
                                ) : historyImages.length === 0 ? (
                                    <div className="col-span-6 py-4 text-center text-gray-500 text-xs">
                                        No history found.
                                    </div>
                                ) : (
                                    historyImages.map((img) => (
                                        <div
                                            key={img.name}
                                            className={`relative aspect-square border-2 rounded-lg overflow-hidden transition-all group ${selectedImageSrc === img.url ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent hover:border-indigo-300'}`}
                                        >
                                            <button
                                                onClick={() => {
                                                    setSelectedImageSrc(img.url);
                                                    toast.success("Loaded previous image for cropping.");
                                                }}
                                                className="w-full h-full block cursor-pointer"
                                                title="Click to load/crop this image"
                                            >
                                                <img src={img.url} alt="History" className="w-full h-full object-cover" />
                                            </button>

                                            {/* Delete from History Button */}
                                            <button
                                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 hover:bg-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirmation({ isOpen: true, type: 'history', item: img });
                                                }}
                                                title="Delete from history"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
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

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent className="z-[200] bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteConfirmation.type === 'current'
                                ? "This will remove the current image. This action cannot be undone immediately, but the image may remain in history."
                                : "This will permanently delete this image from history. This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={performDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
