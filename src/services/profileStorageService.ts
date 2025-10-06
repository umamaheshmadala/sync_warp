// src/services/profileStorageService.ts
import { supabase } from '../lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a profile picture to Supabase Storage
 * @param userId - The user's ID
 * @param file - The image file to upload
 * @returns Promise with the public URL and storage path
 */
export async function uploadProfilePicture(
  userId: string,
  file: File
): Promise<UploadResult> {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Create unique filename with timestamp to avoid caching issues
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar-${timestamp}.${fileExt}`;

    // Delete old avatar if exists
    try {
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        // Delete all old avatars for this user
        const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`);
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete);
      }
    } catch (error) {
      console.warn('Could not delete old avatar:', error);
      // Continue with upload even if delete fails
    }

    // Upload the new file
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath
    };
  } catch (error: any) {
    console.error('Profile picture upload error:', error);
    throw error;
  }
}

/**
 * Delete a profile picture from Supabase Storage
 * @param path - The storage path to the file
 */
export async function deleteProfilePicture(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Profile picture delete error:', error);
    throw error;
  }
}

/**
 * Get the public URL for a profile picture
 * @param path - The storage path to the file
 * @returns The public URL
 */
export function getProfilePictureUrl(path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Resize and compress an image file before upload
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Promise with the resized file
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            resolve(resizedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}
