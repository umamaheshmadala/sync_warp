// src/types/media.ts
// TypeScript types for Media Management System (Story 4B.7)

export type MediaType = 'image' | 'video';

export type MediaProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type MediaTaskType = 
  | 'transcode_video' 
  | 'generate_thumbnail' 
  | 'optimize_image' 
  | 'validate_media';

export type MediaProcessingTaskStatus = 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type MediaEntityType = 'product' | 'business_profile' | 'ad' | 'coupon';

export interface Media {
  id: string;
  entity_type: MediaEntityType;
  entity_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  duration_seconds?: number; // For videos only
  original_filename?: string;
  mime_type?: string;
  processing_status: MediaProcessingStatus;
  upload_error?: string;
  display_order: number;
  uploaded_by?: string;
  uploaded_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaProcessingQueue {
  id: string;
  media_id: string;
  task_type: MediaTaskType;
  priority: number; // 1 = highest, 10 = lowest
  status: MediaProcessingTaskStatus;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  metadata: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaLimitsConfig {
  id: string;
  entity_type: MediaEntityType;
  max_images: number;
  max_videos: number;
  max_video_duration_seconds: number;
  max_image_size_mb: number;
  max_video_size_mb: number;
  allowed_image_formats: string[];
  allowed_video_formats: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaUploadOptions {
  entity_type: MediaEntityType;
  entity_id: string;
  file: File;
  display_order?: number;
  onProgress?: (progress: number) => void;
}

export interface MediaUploadResult {
  success: boolean;
  media?: Media;
  error?: string;
}

export interface MediaValidationError {
  field: string;
  message: string;
  code: 'LIMIT_EXCEEDED' | 'INVALID_FORMAT' | 'FILE_TOO_LARGE' | 'DURATION_EXCEEDED';
}

export interface MediaUploadProgress {
  media_id: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Helper function to check if file is valid
export function validateMediaFile(
  file: File,
  entityType: MediaEntityType,
  limits: MediaLimitsConfig,
  existingMedia: Media[]
): MediaValidationError | null {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  // Check file type
  if (isVideo && !limits.allowed_video_formats.includes(file.type)) {
    return {
      field: 'file',
      message: `Invalid video format. Allowed: ${limits.allowed_video_formats.join(', ')}`,
      code: 'INVALID_FORMAT'
    };
  }

  if (isImage && !limits.allowed_image_formats.includes(file.type)) {
    return {
      field: 'file',
      message: `Invalid image format. Allowed: ${limits.allowed_image_formats.join(', ')}`,
      code: 'INVALID_FORMAT'
    };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (isVideo && fileSizeMB > limits.max_video_size_mb) {
    return {
      field: 'file',
      message: `Video size exceeds ${limits.max_video_size_mb}MB limit`,
      code: 'FILE_TOO_LARGE'
    };
  }

  if (isImage && fileSizeMB > limits.max_image_size_mb) {
    return {
      field: 'file',
      message: `Image size exceeds ${limits.max_image_size_mb}MB limit`,
      code: 'FILE_TOO_LARGE'
    };
  }

  // Check count limits
  const imageCount = existingMedia.filter(m => m.media_type === 'image').length;
  const videoCount = existingMedia.filter(m => m.media_type === 'video').length;

  if (isImage && imageCount >= limits.max_images) {
    return {
      field: 'count',
      message: `Maximum ${limits.max_images} images allowed`,
      code: 'LIMIT_EXCEEDED'
    };
  }

  if (isVideo && videoCount >= limits.max_videos) {
    return {
      field: 'count',
      message: `Maximum ${limits.max_videos} video allowed`,
      code: 'LIMIT_EXCEEDED'
    };
  }

  return null;
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Helper to format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
