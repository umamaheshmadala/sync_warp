// src/services/messageStorageService.ts
import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'message-attachments';
const MAX_FILE_SIZE = 26214400; // 25MB in bytes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export interface UploadResult {
  path: string;
  fullPath: string;
  error?: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  error?: string;
}

/**
 * Build storage path for message attachment
 * Format: {user_id}/{conversation_id}/{timestamp}-{filename}
 */
export const buildAttachmentPath = (
  userId: string,
  conversationId: string,
  filename: string
): string => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${conversationId}/${timestamp}-${sanitizedFilename}`;
};

/**
 * Build thumbnail path from original path
 * Example: "user/conv/123-photo.jpg" -> "user/conv/123-photo_thumb.jpg"
 */
export const buildThumbnailPath = (originalPath: string): string => {
  const lastDot = originalPath.lastIndexOf('.');
  if (lastDot === -1) {
    return `${originalPath}_thumb.jpg`;
  }
  const base = originalPath.substring(0, lastDot);
  return `${base}_thumb.jpg`;
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 25MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
    };
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Only images and videos are supported.`
    };
  }

  return { valid: true };
};

/**
 * Retry helper with exponential backoff
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on validation errors or auth errors
      if (
        lastError.message.includes('not authenticated') ||
        lastError.message.includes('not allowed') ||
        lastError.message.includes('exceeds')
      ) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
};

/**
 * Upload a file to message-attachments bucket with retry logic
 * 
 * @param file - File/Blob to upload
 * @param conversationId - Conversation UUID
 * @returns Upload result with path or error
 */
export const uploadMessageAttachment = async (
  file: File | Blob,
  conversationId: string
): Promise<UploadResult> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        path: '',
        fullPath: '',
        error: 'User not authenticated'
      };
    }

    // Validate file if it's a File (has name/type/size)
    if (file instanceof File) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return {
          path: '',
          fullPath: '',
          error: validation.error
        };
      }
    }

    // Build path
    const filename = file instanceof File ? file.name : 'attachment';
    const path = buildAttachmentPath(user.id, conversationId, filename);

    // Upload to Supabase Storage with retry logic
    const result = await retryWithBackoff(async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false // Prevent accidental overwrites
        });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }, 3, 1000); // 3 retries with 1s, 2s, 4s delays

    return {
      path: result.path,
      fullPath: result.fullPath,
      error: undefined
    };
  } catch (err) {
    console.error('Upload failed after retries:', err);
    return {
      path: '',
      fullPath: '',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

/**
 * Generate a signed URL for viewing an attachment (1-hour expiration)
 * 
 * @param path - Storage path (relative to bucket)
 * @param expiresIn - Expiration in seconds (default 3600 = 1 hour)
 * @returns Signed URL or error
 */
export const getAttachmentSignedUrl = async (
  path: string,
  expiresIn: number = 3600
): Promise<SignedUrlResult> => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return {
        signedUrl: '',
        error: error.message
      };
    }

    return {
      signedUrl: data.signedUrl,
      error: undefined
    };
  } catch (err) {
    console.error('Unexpected signed URL error:', err);
    return {
      signedUrl: '',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

/**
 * Delete an attachment from storage
 * 
 * @param path - Storage path to delete
 * @returns Success boolean and optional error
 */
export const deleteAttachment = async (
  path: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected delete error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

/**
 * Upload multiple files in parallel
 * 
 * @param files - Array of files to upload
 * @param conversationId - Conversation UUID
 * @returns Array of upload results
 */
export const uploadMultipleAttachments = async (
  files: File[],
  conversationId: string
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(file => 
    uploadMessageAttachment(file, conversationId)
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Get public URL for an attachment (only works if bucket is public)
 * For private buckets, use getAttachmentSignedUrl instead
 */
export const getAttachmentPublicUrl = (path: string): string => {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

/**
 * List all attachments for a conversation
 * (For admin/debug purposes - RLS will limit to user's own files)
 * 
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @returns List of file paths
 */
export const listConversationAttachments = async (
  userId: string,
  conversationId: string
): Promise<{ paths: string[]; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`${userId}/${conversationId}`);

    if (error) {
      return { paths: [], error: error.message };
    }

    const paths = data.map(file => `${userId}/${conversationId}/${file.name}`);
    return { paths, error: undefined };
  } catch (err) {
    return {
      paths: [],
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};
