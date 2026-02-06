import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (trimmedImage: Blob) => void;
    imageSrc: string | null;
    aspectRatio?: number;
    title?: string;
    actions?: React.ReactNode;
    footerContent?: React.ReactNode;
    requireInteraction?: boolean;
}

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas is empty'));
            }
        }, 'image/jpeg', 1); // High quality for the crop, compression happens later
    });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
        image.src = url;
    });

export function ImageEditorModal({
    isOpen,
    onClose,
    onSave,
    imageSrc,
    aspectRatio = 1,
    title = 'Edit Image',
    actions,
    footerContent,
    requireInteraction = false,
}: ImageEditorModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Check if it's a new upload (data URL)
    const isNewUpload = imageSrc?.startsWith('data:');

    // Enable save if:
    // 1. It's a new upload (always saveable) OR
    // 2. We don't require interaction (e.g. restoring a history item that differs from current) OR
    // 3. User has interacted (cropped/zoomed)
    // Note: If requireInteraction is true (current image), we strictly wait for interaction.
    const canSave = isNewUpload || !requireInteraction || hasInteracted;

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (imageSrc && croppedAreaPixels) {
            try {
                const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
                onSave(croppedImage);
                onClose();
            } catch (e) {
                console.error(e);
            }
        }
    };

    if (!imageSrc) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-auto flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>{title}</DialogTitle>
                    {actions && <div className="ml-auto mr-4">{actions}</div>}
                </DialogHeader>

                <div className="relative w-full h-[300px] sm:h-[400px] bg-black rounded-md overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={(c) => {
                            setCrop(c);
                        }}
                        onCropComplete={onCropComplete}
                        onZoomChange={(z) => {
                            setZoom(z);
                            setHasInteracted(true);
                        }}
                        onInteractionStart={() => setHasInteracted(true)}
                    />
                </div>

                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <Label>Zoom</Label>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(vals) => {
                                setZoom(vals[0]);
                                setHasInteracted(true);
                            }}
                            className="flex-1"
                        />
                    </div>
                    {footerContent}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!canSave}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
