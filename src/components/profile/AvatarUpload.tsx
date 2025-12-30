import React, { useState, useCallback, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadComplete?: (url: string) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onUploadComplete
}) => {
  const { user, profile, updateProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

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
    pixelCrop: Area
  ): Promise<Blob> => {
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
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 1);
    });
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Read file for cropping
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || '');
      setShowCropModal(true);
      setError(null);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
    reader.readAsDataURL(file);
  }, []);

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    try {
      setUploading(true);
      setError(null);

      // 1. Get cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // 2. Compress/Resize image
      const options = {
        maxSizeMB: 5,
        maxWidthOrHeight: 500,
        useWebWorker: true,
        fileType: 'image/jpeg'
      };

      // Turn blob into file for compression lib
      const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      const compressedFile = await imageCompression(croppedFile, options);

      // 3. Upload to Supabase
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 4. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 5. Update profile
      await updateProfile({ avatar_url: publicUrl });

      // Cleanup
      setImageSrc(null);
      setShowCropModal(false);
      setZoom(1);

      toast.success('Avatar updated successfully!');
      onUploadComplete?.(publicUrl);

    } catch (err) {
      console.error('Error processing avatar:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = profile?.avatar_url || currentAvatar;

  return (
    <>
      <div className="flex flex-col items-center">
        {/* Clickable Avatar Area */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-4 ring-white dark:ring-gray-900 shadow-lg transition-transform transform group-hover:scale-105">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Camera className="w-12 h-12" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100" />
            </div>
          </div>

          {/* Status Indicator */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-center">
            {error}
          </p>
        )}
      </div>

      {/* Crop Modal */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adjust Profile Picture</h3>
              <button
                onClick={() => { setShowCropModal(false); setImageSrc(null); }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-64 bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={false}
              />
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <ZoomOut className="w-4 h-4 text-gray-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <ZoomIn className="w-4 h-4 text-gray-500" />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => { setShowCropModal(false); setImageSrc(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
