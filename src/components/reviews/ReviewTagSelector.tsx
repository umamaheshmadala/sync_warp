// =====================================================
// Story 5.2: Review Tag Selector Component
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Tag, X } from 'lucide-react';
import { REVIEW_TAGS } from '../../types/review';

interface ReviewTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
}

export default function ReviewTagSelector({
  selectedTags,
  onTagsChange,
  maxTags = 5,
}: ReviewTagSelectorProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // Remove tag
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < maxTags) {
      // Add tag
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-gray-500" />
        <label className="text-sm font-semibold text-gray-700">
          Add tags (optional, max {maxTags})
        </label>
        {selectedTags.length > 0 && (
          <span className="text-xs text-gray-500">
            ({selectedTags.length}/{maxTags} selected)
          </span>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map(tag => (
            <motion.button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                inline-flex items-center gap-1 px-3 py-1.5
                bg-blue-100 text-blue-700 rounded-full text-sm font-medium
                hover:bg-blue-200 transition-colors
              "
            >
              {tag}
              <X className="w-3 h-3" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {REVIEW_TAGS.filter(tag => !selectedTags.includes(tag)).map(tag => (
          <motion.button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${selectedTags.length >= maxTags
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            disabled={selectedTags.length >= maxTags}
          >
            {tag}
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Select tags that best describe your experience
      </p>
    </div>
  );
}
