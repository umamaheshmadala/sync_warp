import React, { useState, useCallback, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

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
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = async () => {
    if (!preview || !user) return;

    setUploading(true);
    setError(null);

    try {
      // Convert base64 to blob
      const response = await fetch(preview);
      const blob = await response.blob();

      // Generate unique filename
      const fileExt = blob.type.split('/')[1];
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      await updateProfile({ avatar_url: publicUrl });

      setPreview(null);
      toast.success('Avatar uploaded successfully!', {
        duration: 3000,
        icon: '📸',
      });
      onUploadComplete?.(publicUrl);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const avatarUrl = preview || currentAvatar || profile?.avatar_url;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Preview */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-4 ring-white dark:ring-gray-900 shadow-lg">
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
        </div>

        {/* Upload Button Overlay */}
        {!preview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
            disabled={uploading}
          >
            <Upload className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      {preview && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Help Text */}
      {!preview && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Click the upload button to change your avatar. Max size: 5MB
        </p>
      )}
    </div>
  );
};
