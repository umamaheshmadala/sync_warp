import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import imageCompression from 'browser-image-compression';

interface ReviewPhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

// Compression options: max 1MB, max 1920px dimension, maintain quality
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.8,
};

// Sortable Photo Item Component
function SortablePhoto({ url, onRemove, id }: { url: string; onRemove: () => void; id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden"
    >
      <img
        src={url}
        alt="Review upload"
        className="w-full h-full object-cover"
      />

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={14} />
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag start
          onRemove();
        }}
        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function ReviewPhotoUpload({
  photos,
  onChange,
  maxPhotos = 5
}: ReviewPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check limits
    if (photos.length + files.length > maxPhotos) {
      toast.error(`You can only upload up to ${maxPhotos} photos`);
      return;
    }

    setIsUploading(true);
    const newPhotos = [...photos];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate type
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name} is not an image`);
          continue;
        }

        let fileToUpload: File = file;

        // Compress image if over 500KB (to ensure final is under 1MB after compression)
        if (file.size > 500 * 1024) {
          try {
            setCompressionProgress(`Optimizing ${file.name}...`);
            fileToUpload = await imageCompression(file, COMPRESSION_OPTIONS);
            console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(fileToUpload.size / 1024).toFixed(0)}KB`);
          } catch (compressionError) {
            console.error('Compression failed:', compressionError);
            // If compression fails and file is too large, reject it
            if (file.size > 1 * 1024 * 1024) {
              errors.push(`Failed to compress ${file.name}`);
              continue;
            }
            // If under 1MB, use original
          } finally {
            setCompressionProgress(null);
          }
        }

        // Upload to Supabase
        const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `review-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reviews')
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          errors.push(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('reviews')
          .getPublicUrl(filePath);

        newPhotos.push(publicUrl);
      }

      onChange(newPhotos);

      if (errors.length > 0) {
        toast.error(errors.join('\n'));
      } else {
        toast.success('Photos uploaded successfully');
      }
    } catch (err) {
      console.error('Upload process error:', err);
      toast.error('An error occurred during upload');
    } finally {
      setIsUploading(false);
      setCompressionProgress(null);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = photos.indexOf(active.id as string);
      const newIndex = photos.indexOf(over!.id as string);
      onChange(arrayMove(photos, oldIndex, newIndex));
    }
  };

  const handleRemove = (urlToRemove: string) => {
    onChange(photos.filter(url => url !== urlToRemove));
  };

  return (
    <div className="space-y-4">
      {/* Photo Grid / List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={photos}
          strategy={rectSortingStrategy}
        >
          <div className="flex flex-wrap gap-3">
            {photos.map((url) => (
              <SortablePhoto
                key={url}
                id={url}
                url={url}
                onRemove={() => handleRemove(url)}
              />
            ))}

            {/* Upload Button */}
            {photos.length < maxPhotos && (
              <div className="w-24 h-24 flex-shrink-0">
                <label className={`
                  flex flex-col items-center justify-center w-full h-full 
                  border-2 border-dashed border-gray-300 rounded-lg 
                  cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors
                  ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}>
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500 font-medium">Add Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Helper Text */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{photos.length} / {maxPhotos} photos</span>
        <span>{compressionProgress || 'Auto-optimized for best quality'}</span>
      </div>
    </div>
  );
}
