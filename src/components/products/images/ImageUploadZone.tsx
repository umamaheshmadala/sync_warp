import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageUploadZoneProps {
    onImagesSelected: (files: File[]) => void;
    maxFiles?: number;
    currentFilesCount: number;
    disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
    onImagesSelected,
    maxFiles = 5,
    currentFilesCount,
    disabled = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const remainingSlots = maxFiles - currentFilesCount;

    const handleFiles = (files: FileList | null) => {
        if (!files) return;

        if (files.length > remainingSlots) {
            toast.error(`You can only add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}`);
            return;
        }

        const validFiles: File[] = [];

        Array.from(files).forEach((file) => {
            // Check file type
            if (!SUPPORTED_TYPES.includes(file.type.toLowerCase()) && !file.name.toLowerCase().endsWith('.heic')) {
                // Note: basic check, heic might report empty type on some browsers
                toast.error(`Unsupported format: ${file.name}`);
                return;
            }

            // Check file size
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast.error(`File too large: ${file.name} (Max ${MAX_FILE_SIZE_MB}MB)`);
                return;
            }

            validFiles.push(file);
        });

        if (validFiles.length > 0) {
            onImagesSelected(validFiles);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
    };

    const onClick = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    return (
        <div
            onClick={onClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
        relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200
        ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                multiple
                accept="image/jpeg,image/png,image/webp,.heic,.heif"
                disabled={disabled}
            />

            <div className="bg-gray-100 p-3 rounded-full mb-3">
                <Upload className="w-6 h-6 text-gray-500" />
            </div>

            <p className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, WebP (Max {MAX_FILE_SIZE_MB}MB)
                <br />
                {currentFilesCount}/{maxFiles} images uploaded
            </p>
        </div>
    );
};
