// =====================================================
// Story 5.2: Business Owner Response Form
// =====================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, CheckCircle, AlertCircle } from 'lucide-react';
import { countWords } from '../../services/reviewService';
import { RESPONSE_TEXT_WORD_LIMIT } from '../../types/review';
import type { CreateResponseInput, UpdateResponseInput } from '../../types/review';
import WordCounter from './WordCounter';

interface ReviewResponseFormProps {
  reviewId: string;
  businessId: string;
  existingResponse?: {
    id: string;
    response_text: string;
  } | null;
  onSubmit: (data: CreateResponseInput | UpdateResponseInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ReviewResponseForm({
  reviewId,
  businessId,
  existingResponse,
  onSubmit,
  onCancel,
  loading = false,
}: ReviewResponseFormProps) {
  const [responseText, setResponseText] = useState(existingResponse?.response_text || '');
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isEditing = !!existingResponse;

  // Update word count when text changes
  useEffect(() => {
    setWordCount(countWords(responseText));
  }, [responseText]);

  // Validation
  const isValid = responseText.trim().length > 0;
  const isOverLimit = wordCount > RESPONSE_TEXT_WORD_LIMIT;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newWordCount = countWords(newText);
    
    setResponseText(newText);
    
    if (newWordCount > RESPONSE_TEXT_WORD_LIMIT) {
      setError(`Response text exceeds ${RESPONSE_TEXT_WORD_LIMIT} word limit`);
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || isOverLimit) {
      setError('Please enter a valid response within the word limit');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        await onSubmit({
          response_text: responseText.trim(),
        } as UpdateResponseInput);
      } else {
        await onSubmit({
          review_id: reviewId,
          business_id: businessId,
          response_text: responseText.trim(),
        } as CreateResponseInput);
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto relative"
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
                Response {isEditing ? 'Updated' : 'Posted'}!
              </h3>
              <p className="text-gray-600">Thank you for engaging with your customers</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Response' : 'Respond to Review'}
            </h2>
            <p className="text-sm text-gray-600">
              Business Owner Response
            </p>
          </div>
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
        {/* Response Text */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Response *
          </label>
          <div className="relative">
            <textarea
              value={responseText}
              onChange={handleTextChange}
              placeholder="Thank the customer, address their feedback, or share additional information..."
              rows={5}
              className={`
                w-full px-4 py-3 border rounded-xl resize-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${isOverLimit ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
              `}
              disabled={isSubmitting}
            />
            <WordCounter
              current={wordCount}
              limit={RESPONSE_TEXT_WORD_LIMIT}
              className="absolute bottom-3 right-3"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Keep it professional and helpful ({RESPONSE_TEXT_WORD_LIMIT} words max)
          </p>
        </div>

        {/* Best Practices */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Response Best Practices
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Thank the customer for their feedback</li>
            <li>• Address specific concerns mentioned</li>
            <li>• Be professional and courteous</li>
            <li>• Offer solutions if applicable</li>
            <li>• Keep it concise and relevant</li>
          </ul>
        </div>

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
                {isEditing ? 'Updating...' : 'Posting...'}
              </span>
            ) : (
              isEditing ? 'Update Response' : 'Post Response'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
