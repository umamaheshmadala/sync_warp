import React, { useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useProductWizardStore } from '../../../../stores/useProductWizardStore';
import { useImagePicker } from '../../../../hooks/products/creation/useImagePicker';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

import { DiscardDialog } from '../DiscardDialog';

export const MediaSelectionStep: React.FC = () => {
    const { addImages, setStep, closeWizard, reset, editMode } = useProductWizardStore();
    const { pickImages, takePhoto } = useImagePicker();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

    const handleFiles = async (files: File[]) => {
        const validFiles = files.filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        if (validFiles.length > 5) {
            toast.error('Maximum 5 images allowed');
            return;
        }

        const newImages = await Promise.all(validFiles.map(async (file) => ({
            id: uuidv4(),
            url: URL.createObjectURL(file),
            file,
            order: 0 // Will assign proper index in store or effect
        })));

        addImages(newImages);
        setStep('edit'); // Auto-advance
    };

    const handlePickImages = async () => {
        // On Web, triggering the file input strictly is better for multi-selection
        if (!Capacitor.isNativePlatform()) {
            fileInputRef.current?.click();
            return;
        }

        const picked = await pickImages(5);
        if (picked.length > 0) {
            const newImages = picked.map(img => ({
                id: uuidv4(),
                url: img.webPath || '',
                file: undefined, // Native pick might not give file obj immediately
                order: 0
            }));
            addImages(newImages);
            setStep('edit');
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50">
            {/* Header for Step 1 */}
            <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center border-b border-gray-100 bg-white px-4">
                <h1 className="font-semibold text-lg text-gray-900">
                    {editMode ? 'Edit Product' : 'Create new product'}
                </h1>
                <button
                    onClick={() => setShowDiscardDialog(true)}
                    className="absolute right-4 p-2 hover:bg-gray-100 rounded-full"
                >
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>

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

            <div
                className="w-full max-w-md flex flex-col items-center space-y-8 mt-12 cursor-pointer"
                onClick={handlePickImages}
            >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center animate-pulse-slow">
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-xl font-medium text-gray-900">Select Product Images</h2>
                    <p className="text-gray-500">Tap anywhere to select photos</p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={handlePickImages}
                        className="w-full py-3 flex items-center justify-center gap-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                        <Upload className="w-5 h-5" />
                        Select from Device
                    </button>

                    {/* Web File Input Fallback */}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                    />
                </div>
            </div>

            <div
                className="absolute inset-0 z-0 pointer-events-none"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files) {
                        handleFiles(Array.from(e.dataTransfer.files));
                    }
                }}
            />
        </div>
    );
};
