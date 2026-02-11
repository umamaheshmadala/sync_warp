import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Edit3 } from 'lucide-react';
import { ImageCropper } from '@/components/products/images/ImageCropper';
import { Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

interface ImageUploadWithCropperProps {
    label: string;
    image: File | null;
    onChange: (file: File | null) => void;
    aspect?: number;
    className?: string;
    previewClassName?: string;
    placeholderText?: string;
}

export const ImageUploadWithCropper: React.FC<ImageUploadWithCropperProps> = ({
    label,
    image,
    onChange,
    aspect = 1,
    className = "",
    previewClassName = "w-full h-48",
    placeholderText = "Click to upload image"
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || '');
            setShowCropper(true);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
        reader.readAsDataURL(file);
    };

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area,
        rotation = 0
    ): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        // set each dimensions to double largest dimension to allow for a safe area for the
        // image to rotate in without being clipped by canvas context
        canvas.width = safeArea;
        canvas.height = safeArea;

        // translate canvas context to a central location on image to allow rotating around the center.
        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-safeArea / 2, -safeArea / 2);

        // draw rotated image and store data.
        ctx.drawImage(
            image,
            safeArea / 2 - image.width * 0.5,
            safeArea / 2 - image.height * 0.5
        );

        const data = ctx.getImageData(0, 0, safeArea, safeArea);

        // set canvas width to final desired crop size - this will clear existing context
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // paste generated rotate image with correct offsets for x,y crop values.
        ctx.putImageData(
            data,
            Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
            Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', 1);
        });
    };

    const handleCropComplete = async (croppedAreaPixels: Area, rotation: number) => {
        if (!imageSrc) return;

        try {
            setProcessing(true);
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

            // Compress
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
                fileType: 'image/jpeg'
            };

            const croppedFile = new File([croppedBlob], "image.jpg", { type: "image/jpeg" });
            const compressedFile = await imageCompression(croppedFile, options);

            onChange(compressedFile);
            setShowCropper(false);
            setImageSrc(null);
        } catch (error) {
            console.error('Error processing image:', error);
            toast.error('Failed to process image');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>

            <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="hidden"
                    id={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
                />

                {image ? (
                    <div className="relative group">
                        <div className="flex items-center justify-center">
                            <img
                                src={URL.createObjectURL(image)}
                                alt={`${label} preview`}
                                className={`${previewClassName} object-cover rounded shadow-sm`}
                            />
                        </div>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                                title="Change Image"
                            >
                                <Edit3 className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onChange(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                                title="Remove Image"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 truncate">{image.name}</p>
                    </div>
                ) : (
                    <label
                        htmlFor={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
                        className="cursor-pointer flex flex-col items-center justify-center py-6"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                            {placeholderText}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, GIF up to 5MB
                        </p>
                    </label>
                )}

                {processing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                )}
            </div>

            {imageSrc && (
                <ImageCropper
                    isOpen={showCropper}
                    onClose={() => {
                        setShowCropper(false);
                        setImageSrc(null);
                    }}
                    imageSrc={imageSrc}
                    onCropComplete={handleCropComplete}
                    aspect={aspect}
                />
            )}
        </div>
    );
};
