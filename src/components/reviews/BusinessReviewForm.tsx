// =====================================================
// Story 5.2: Binary Review System - Review Form
// =====================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, X, CheckCircle, AlertCircle, Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { countWords, updateReview } from '../../services/reviewService';
import { REVIEW_TEXT_WORD_LIMIT, REVIEW_TEXT_MIN_WORDS } from '../../types/review';
import type { CreateReviewInput } from '../../types/review';
import ReviewTagSelector from './ReviewTagSelector';
import WordCounter from './WordCounter';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import imageCompression from 'browser-image-compression';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BusinessReviewFormProps {
  businessId: string;
  businessName: string;
  checkinId: string | null;
  onSubmit: (review: CreateReviewInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  editMode?: boolean;
  existingReview?: any;
}

// Compression options
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.8,
};

// Sortable Photo Component
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
      {...attributes}
      {...listeners}
      className="relative w-16 h-16 shrink-0 group touch-none select-none mr-3 mt-2"
    >
      {/* Photo Container */}
      <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-move">
        <img src={url} alt="Uploaded" className="w-full h-full object-cover pointer-events-none" />
      </div>

      {/* Cancel Button - Outside Top Right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag start
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag anchor
        className="absolute -top-2 -right-2 p-1.5 text-gray-400 hover:text-red-500 transition-colors z-10"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function BusinessReviewForm({
  businessId,
  businessName,
  checkinId,
  onSubmit,
  onCancel,
  loading = false,
  editMode = false,
  existingReview = null,
}: BusinessReviewFormProps) {
  // Form state
  const [recommendation, setRecommendation] = useState<boolean | null>(
    editMode && existingReview ? existingReview.recommendation : null
  );
  const [reviewText, setReviewText] = useState(
    editMode && existingReview ? existingReview.review_text || '' : ''
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    editMode && existingReview
      ? (existingReview.photo_urls || (existingReview.photo_url ? [existingReview.photo_url] : []))
      : []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    editMode && existingReview ? existingReview.tags || [] : []
  );
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Require 5px movement to start drag
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }) // Delay for touch to distinguish scroll vs drag
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = photoUrls.indexOf(active.id as string);
      const newIndex = photoUrls.indexOf(over!.id as string);
      setPhotoUrls(arrayMove(photoUrls, oldIndex, newIndex));
    }
  };

  // Update word count
  useEffect(() => {
    setWordCount(countWords(reviewText));
  }, [reviewText]);

  // Validation
  const isValid = recommendation !== null;
  const isOverLimit = wordCount > REVIEW_TEXT_WORD_LIMIT;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newWordCount = countWords(newText);
    setReviewText(newText);

    // Only show error on excessive length
    if (newWordCount > REVIEW_TEXT_WORD_LIMIT) {
      setError(`Limit exceeded: ${REVIEW_TEXT_WORD_LIMIT} words`);
    } else {
      setError(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photoUrls.length + files.length > 5) {
      toast.error('Max 5 photos allowed');
      return;
    }

    setIsUploading(true);
    const newPhotos = [...photoUrls];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        let fileToUpload: File = file;

        // Compress if needed
        if (file.size > 500 * 1024) {
          try {
            fileToUpload = await imageCompression(file, COMPRESSION_OPTIONS);
          } catch (err) {
            console.error('Compression failed', err);
            if (file.size > 1024 * 1024) {
              errors.push(`File too large: ${file.name}`);
              continue;
            }
          }
        }

        const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `review-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reviews')
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error('Upload error', uploadError);
          errors.push('Upload failed');
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('reviews')
          .getPublicUrl(filePath);

        newPhotos.push(publicUrl);
      }
      setPhotoUrls(newPhotos);
      if (errors.length > 0) toast.error(errors.join(', '));
      else toast.success('Photos added');
    } catch (err) {
      console.error(err);
      toast.error('Error uploading photos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (urlToRemove: string) => {
    setPhotoUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reviewText.trim()) {
      const currentWordCount = countWords(reviewText);
      if (currentWordCount > REVIEW_TEXT_WORD_LIMIT) {
        setError(`Limit exceeded`);
        return;
      }
    }

    if (!isValid) {
      setError('Recommendation required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submissionData = {
        recommendation: recommendation!,
        review_text: reviewText.trim() || undefined,
        photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        checkin_id: checkinId || undefined,
      };

      if (editMode && existingReview) {
        await updateReview(existingReview.id, submissionData);
      } else {
        await onSubmit({
          ...submissionData,
          business_id: businessId,
        } as CreateReviewInput);
      }

      setShowSuccess(true);
      setTimeout(onCancel, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-auto overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <div className="absolute inset-0 bg-white z-50 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-gray-900">Submitted!</h3>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Header - Compact */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50 shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900 leading-tight">
            {editMode ? 'Edit Review' : 'Write Review'}
          </h2>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">{businessName}</p>
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500">
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto p-4 space-y-4 flex-1">

        {/* Compact Recommendation */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRecommendation(true)}
            className={`
              flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
              ${recommendation === true
                ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
            `}
          >
            <ThumbsUp size={18} className={recommendation === true ? 'fill-current' : ''} />
            <span className="font-semibold text-sm">Recommend</span>
          </button>

          <button
            type="button"
            onClick={() => setRecommendation(false)}
            className={`
              flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
              ${recommendation === false
                ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
            `}
          >
            <ThumbsDown size={18} className={recommendation === false ? 'fill-current' : ''} />
            <span className="font-semibold text-sm">Not Recommended</span>
          </button>
        </div>

        {/* Text Area with Integrated Photo Trigger */}
        <div className="relative">
          <textarea
            value={reviewText}
            onChange={handleTextChange}
            placeholder="Share your experience (optional)..."
            rows={3}
            className={`
              w-full px-4 pt-3 pb-10 border rounded-xl resize-none text-sm
              focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              ${isOverLimit ? 'border-red-300' : 'border-gray-300'}
            `}
          />

          {/* Bottom Toolbar inside Textarea */}
          <div className="absolute bottom-2 left-2 right-3 flex justify-between items-center">
            {/* Photo Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || photoUrls.length >= 5}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
              title="Add Photos"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : <Camera size={18} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Word Counter */}
            <div className="text-xs text-gray-400 font-medium">
              {wordCount}/{REVIEW_TEXT_WORD_LIMIT}
            </div>
          </div>
        </div>

        {/* Photo List (Drag-and-Drop) */}
        {photoUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={photoUrls} strategy={rectSortingStrategy}>
                {photoUrls.map((url) => (
                  <SortablePhoto
                    key={url}
                    id={url}
                    url={url}
                    onRemove={() => removePhoto(url)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Tags */}
        <ReviewTagSelector
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-white shrink-0 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-gray-600 font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isOverLimit || isSubmitting}
          className={`
            flex-1 py-2.5 text-white font-semibold rounded-lg shadow-sm text-sm
            ${isValid && !isOverLimit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}
          `}
        >
          {isSubmitting ? 'Sending...' : (editMode ? 'Update' : 'Submit')}
        </button>
      </div>
    </motion.div>
  );
}
