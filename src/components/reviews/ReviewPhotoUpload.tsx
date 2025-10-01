// =====================================================
// Story 5.2: Review Photo Upload Component
// =====================================================

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReviewPhotoUploadProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

export default function ReviewPhotoUpload({
  photoUrl,
  onPhotoChange,
}: ReviewPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `review_photos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      onPhotoChange(publicUrl);
      console.log('✅ Photo uploaded successfully:', publicUrl);
    } catch (err) {
      console.error('❌ Photo upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-4 h-4 text-gray-500" />
        <label className="text-sm font-semibold text-gray-700">
          Add a photo (optional)
        </label>
      </div>

      <AnimatePresence mode="wait">
        {photoUrl ? (
          // Photo Preview
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative"
          >
            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
              <img
                src={photoUrl}
                alt="Review photo"
                className="w-full h-48 object-cover"
              />
              <motion.button
                type="button"
                onClick={handleRemovePhoto}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="
                  absolute top-2 right-2 p-2 bg-red-500 text-white
                  rounded-full hover:bg-red-600 transition-colors
                "
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Photo added successfully
            </p>
          </motion.div>
        ) : (
          // Upload Button
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={uploading}
              className="
                w-full p-6 border-2 border-dashed border-gray-300
                rounded-xl hover:border-blue-400 hover:bg-blue-50
                transition-colors flex flex-col items-center gap-3
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {uploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
                  />
                  <span className="text-sm text-gray-600 font-medium">
                    Uploading photo...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Click to upload a photo
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, or GIF (max 5MB)
                    </p>
                  </div>
                  <Upload className="w-4 h-4 text-gray-400" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-red-600 mt-2"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
