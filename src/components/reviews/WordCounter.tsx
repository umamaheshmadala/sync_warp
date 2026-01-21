// =====================================================
// Custom Word Counter Component
// Updated for Story 11.2.1
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';

interface WordCounterProps {
  text: string;
  maxWords?: number;
  minWords?: number;
  className?: string;
}

const DEFAULT_MAX_WORDS = 150;
const DEFAULT_MIN_WORDS = 1;

/**
 * Utility to count words in text
 */
export function countWords(text: string | null | undefined): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate word count against limits
 * Returns valid=true if empty (optional) or within range
 */
export function validateWordCount(
  text: string,
  minWords: number = 1,
  maxWords: number = 150
): { valid: boolean; error?: string } {
  const wordCount = countWords(text);

  // Empty text is allowed (optional)
  if (!text || !text.trim()) {
    return { valid: true };
  }

  // Check minimum
  if (wordCount < minWords) {
    return {
      valid: false,
      error: `Please write at least ${minWords} word${minWords > 1 ? 's' : ''}`
    };
  }

  // Check maximum
  if (wordCount > maxWords) {
    return {
      valid: false,
      error: `Please keep your review under ${maxWords} words (currently ${wordCount})`
    };
  }

  return { valid: true };
}

export default function WordCounter({
  text,
  maxWords = DEFAULT_MAX_WORDS,
  minWords = DEFAULT_MIN_WORDS,
  className = ''
}: WordCounterProps) {
  // Handle undefined text
  const safeText = text || '';
  const current = countWords(safeText);
  const percentage = (current / maxWords) * 100;
  const isOverLimit = current > maxWords;
  const isNearLimit = percentage >= 80 && percentage <= 100;

  const showMinWarning = safeText.trim().length > 0 && current < minWords;

  // Determine color based on status
  const getColor = () => {
    if (isOverLimit) return 'text-red-600 font-bold';
    if (percentage >= 93) return 'text-red-600'; // 140+ words
    if (percentage >= 80) return 'text-yellow-600'; // 120+ words
    return 'text-gray-500';
  };

  const getBgColor = () => {
    if (isOverLimit) return 'bg-red-50';
    if (isNearLimit) return 'bg-yellow-50';
    return 'bg-gray-50';
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
          ${getBgColor()} ${getColor()} ${className}
        `}
      >
        <span>{current}</span>
        <span className="opacity-50">/</span>
        <span>{maxWords}</span>
        {isOverLimit && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-red-600 ml-1"
          >
            ⚠️
          </motion.span>
        )}
      </motion.div>

      {showMinWarning && (
        <span className="text-red-500 text-xs">
          Min {minWords} word required
        </span>
      )}
    </div>
  );
}
