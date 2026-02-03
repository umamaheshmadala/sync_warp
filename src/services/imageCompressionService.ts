import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    useWebWorker: boolean;
    fileType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1350, // Max height for 4:5 ratio (1080x1350)
    useWebWorker: true,
    fileType: 'image/jpeg',
};

export const imageCompressionService = {
    /**
     * Compresses an image file according to specified options
     */
    async compressImage(file: File, options: Partial<CompressionOptions> = {}): Promise<File> {
        const compressionConfig = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        try {
            // Basic validation
            if (!file) {
                throw new Error('No file provided for compression');
            }

            // If file is already smaller than max size, we might still want to resize/convert
            // checking dimensions requires reading the image which browser-image-compression does internally

            const compressedFile = await imageCompression(file, compressionConfig);

            // Log compression result (useful for debugging)
            console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

            return compressedFile;
        } catch (error) {
            console.error('Image compression failed:', error);
            // Fallback: return original file if compression fails, but warn
            // Ideally we should throw, but depending on UX we might want to try uploading original
            // For now, let's throw so the UI can handle "File too large" if original is huge
            throw new Error('Failed to compress image. Please try a different image.');
        }
    },

    /**
     * Converts a blob/url to a File object
     */
    async urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type: mimeType });
    }
};
