import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { imageCompressionService } from '../../../services/imageCompressionService';

export interface PickedImage {
    webPath?: string; // For web/webview display
    format: string;
    blob?: Blob; // If available (mostly web)
}

export const useImagePicker = () => {
    const pickImages = async (
        limit: number = 1
    ): Promise<PickedImage[]> => {
        try {
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                // Use FilePicker for multi-select on native
                const result = await FilePicker.pickImages({
                    limit,
                    readData: false, // We just need paths usually
                });

                return result.files.map(img => ({
                    // FilePicker returns 'path', need to convert to webPath if needed
                    // Actually Capacitor handles file:// paths in image tags
                    // But let's check the type, it returns { path, name, mimeType, size }
                    // To show in img src we might need Capacitor.convertFileSrc(path)
                    webPath: Capacitor.convertFileSrc(img.path!),
                    format: img.mimeType.split('/')[1] || 'jpeg',
                }));
            } else {
                // Fallback for Web: Use Capacitor Camera, but it only supports single image usually
                // For web, it's better to use specific input type="file" in the UI for multi-select
                // BUT if this hook is called from a button:
                // We can simulate single pick loop or just pick one.
                // Let's use Camera for single pick flow compatibility if used directly

                // Actually, for web, we should probably stick to the HTML input in the UI
                // and only use this hook for specific "Take Photo" actions.
                // But to fulfill the contract:

                const photo = await Camera.getPhoto({
                    resultType: CameraResultType.Uri,
                    source: CameraSource.Photos,
                    quality: 90,
                    webUseInput: true, // Uses file input
                });

                // Fetch original blob
                const response = await fetch(photo.webPath!);
                const blob = await response.blob();

                // Convert to File for compression
                const file = new File([blob], `picked.${photo.format}`, { type: `image/${photo.format}` });

                // Compress
                let compressedFile = file;
                try {
                    compressedFile = await imageCompressionService.compressImage(file, {
                        maxWidthOrHeight: 1500, // Reasonable max for product images
                        maxSizeMB: 0.8 // Target sub-MB size
                    });
                } catch (e) {
                    console.warn("Compression failed, using original", e);
                }

                return [{
                    webPath: photo.webPath, // Keep original path for immediate display? Or create new obj URL?
                    // Better to use new obj URL from compressed file to see actual quality
                    // But Camera returns a path. Let's use the compressed blob.
                    format: photo.format,
                    blob: compressedFile
                }];
            }
        } catch (error: any) {
            if (error.message !== 'User cancelled photos app') {
                console.error('Pick images failed:', error);
                toast.error('Failed to select images');
            }
            return [];
        }
    };

    const takePhoto = async (): Promise<PickedImage | null> => {
        try {
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera // Force Camera
            });

            return {
                webPath: photo.webPath,
                format: photo.format,
                blob: await fetch(photo.webPath!).then(r => r.blob())
            };
        } catch (e) {
            return null;
        }
    };

    return { pickImages, takePhoto };
};
