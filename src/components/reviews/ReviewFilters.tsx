// =====================================================
// Story 5.2: Review Filters Component
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import type { ReviewFilters as ReviewFiltersType } from '../../types/review';

interface ReviewFiltersProps {
  filters: ReviewFiltersType;
  onFiltersChange: (filters: ReviewFiltersType) => void;
  reviewCount: number;
}

export default function ReviewFilters({
  filters,
  onFiltersChange,
  reviewCount,
}: ReviewFiltersProps) {
  const updateFilter = (key: keyof ReviewFiltersType, value: any) => {
    // Toggle boolean filters
    if (typeof value === 'boolean' && filters[key] === value) {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Filters & Sort</h3>
        {reviewCount > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort by
          </label>
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('sort_by', 'newest')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.sort_by === 'newest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Newest First
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('sort_by', 'oldest')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.sort_by === 'oldest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Oldest First
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('sort_by', 'most-helpful')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.sort_by === 'most-helpful'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Most Helpful
            </motion.button>
          </div>
        </div>

        {/* Filter Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Show only
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Recommends Filter */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('recommendation', true)}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.recommendation === true
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                }
              `}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="hidden sm:inline">Recommends</span>
            </motion.button>

            {/* Doesn't Recommend Filter */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('recommendation', false)}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.recommendation === false
                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                }
              `}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="hidden sm:inline">Doesn't</span>
            </motion.button>

            {/* With Text Filter */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('has_text', true)}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.has_text
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                }
              `}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">With Text</span>
            </motion.button>

            {/* With Photo Filter */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateFilter('has_photo', true)}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${filters.has_photo
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                }
              `}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">With Photo</span>
            </motion.button>
          </div>
        </div>

        {/* Clear Filters */}
        {Object.keys(filters).length > 1 && ( // More than just sort_by
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onFiltersChange({ sort_by: 'newest' })}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Clear All Filters
          </motion.button>
        )}
      </div>
    </div>
  );
}
