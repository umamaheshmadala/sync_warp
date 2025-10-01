// =====================================================
// Story 5.2: Binary Review System - Review Form
// =====================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, X, CheckCircle, AlertCircle } from 'lucide-react';
import { countWords } from '../../services/reviewService';
import { REVIEW_TEXT_WORD_LIMIT, REVIEW_TAGS } from '../../types/review';
import type { CreateReviewInput } from '../../types/review';
import ReviewTagSelector from './ReviewTagSelector';
import ReviewPhotoUpload from './ReviewPhotoUpload';
import WordCounter from './WordCounter';

interface BusinessReviewFormProps {
  businessId: string;
  businessName: string;
  checkinId: string;
  onSubmit: (review: CreateReviewInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function BusinessReviewForm({
  businessId,
  businessName,
  checkinId,
  onSubmit,
  onCancel,
  loading = false,
}: BusinessReviewFormProps) {
  // Form state
  const [recommendation, setRecommendation] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Update word count when text changes
  useEffect(() => {
    setWordCount(countWords(reviewText));
  }, [reviewText]);

  // Validation
  const isValid = recommendation !== null;
  const isOverLimit = wordCount > REVIEW_TEXT_WORD_LIMIT;

  // Handle text change with word limit warning
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newWordCount = countWords(newText);
    
    // Allow typing but warn if over limit
    setReviewText(newText);
    
    if (newWordCount > REVIEW_TEXT_WORD_LIMIT) {
      setError(`Review text exceeds ${REVIEW_TEXT_WORD_LIMIT} word limit`);
    } else {
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || isOverLimit) {
      setError('Please select a recommendation and ensure text is within word limit');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        business_id: businessId,
        recommendation: recommendation!,
        review_text: reviewText.trim() || undefined,
        photo_url: photoUrl || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        checkin_id: checkinId,
      });

      // Show success message
      setShowSuccess(true);
      
      // Close form after brief delay
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto"
    >
      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center z-50"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Review Submitted!
              </h3>
              <p className="text-gray-600">Thank you for your feedback</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Write a Review</h2>
          <p className="text-sm text-gray-600 mt-1">{businessName}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Binary Recommendation Choice */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Would you recommend this business? *
          </label>
          <div className="grid grid-cols-2 gap-4">
            {/* Recommend Button */}
            <motion.button
              type="button"
              onClick={() => setRecommendation(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-6 rounded-xl border-2 transition-all
                ${recommendation === true
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 bg-white'
                }
              `}
            >
              <ThumbsUp
                className={`w-12 h-12 mx-auto mb-3 ${
                  recommendation === true ? 'text-green-500' : 'text-gray-400'
                }`}
              />
              <div className="text-center">
                <div className={`font-bold text-lg ${
                  recommendation === true ? 'text-green-700' : 'text-gray-700'
                }`}>
                  Recommend
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  I'd return here
                </div>
              </div>
              {recommendation === true && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3"
                >
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </motion.div>
              )}
            </motion.button>

            {/* Don't Recommend Button */}
            <motion.button
              type="button"
              onClick={() => setRecommendation(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-6 rounded-xl border-2 transition-all
                ${recommendation === false
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 bg-white'
                }
              `}
            >
              <ThumbsDown
                className={`w-12 h-12 mx-auto mb-3 ${
                  recommendation === false ? 'text-red-500' : 'text-gray-400'
                }`}
              />
              <div className="text-center">
                <div className={`font-bold text-lg ${
                  recommendation === false ? 'text-red-700' : 'text-gray-700'
                }`}>
                  Don't Recommend
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Not my experience
                </div>
              </div>
              {recommendation === false && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3"
                >
                  <CheckCircle className="w-6 h-6 text-red-500" />
                </motion.div>
              )}
            </motion.button>
          </div>
        </div>

        {/* Review Text (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Share your experience (optional)
          </label>
          <div className="relative">
            <textarea
              value={reviewText}
              onChange={handleTextChange}
              placeholder="What made your experience great or not so great?"
              rows={4}
              className={`
                w-full px-4 py-3 border rounded-xl resize-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${isOverLimit ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
              `}
            />
            <WordCounter
              current={wordCount}
              limit={REVIEW_TEXT_WORD_LIMIT}
              className="absolute bottom-3 right-3"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Keep it brief and helpful ({REVIEW_TEXT_WORD_LIMIT} words max)
          </p>
        </div>

        {/* Photo Upload */}
        <ReviewPhotoUpload
          photoUrl={photoUrl}
          onPhotoChange={setPhotoUrl}
        />

        {/* Tags Selector */}
        <ReviewTagSelector
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GPS Check-in Notice */}
        <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              You're all set!
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Your check-in has been verified. You can now leave a review.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <motion.button
            type="button"
            onClick={onCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="
              flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl
              font-semibold hover:bg-gray-200 transition-colors
            "
            disabled={isSubmitting}
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex-1 px-6 py-3 rounded-xl font-semibold transition-all
              ${isValid && !isOverLimit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
            disabled={!isValid || isOverLimit || isSubmitting || loading}
          >
            {isSubmitting || loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Submitting...
              </span>
            ) : (
              'Submit Review'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
