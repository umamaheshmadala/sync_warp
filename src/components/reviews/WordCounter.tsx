// =====================================================
// Story 5.2: Word Counter Component
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';

interface WordCounterProps {
  current: number;
  limit: number;
  className?: string;
}

export default function WordCounter({ current, limit, className = '' }: WordCounterProps) {
  const percentage = (current / limit) * 100;
  const isOverLimit = current > limit;
  const isNearLimit = percentage >= 80 && percentage <= 100;

  // Determine color based on status
  const getColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const getBgColor = () => {
    if (isOverLimit) return 'bg-red-50';
    if (isNearLimit) return 'bg-yellow-50';
    return 'bg-gray-50';
  };

  return (
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
      <span>{limit}</span>
      {isOverLimit && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-red-600"
        >
          ⚠️
        </motion.span>
      )}
    </motion.div>
  );
}
