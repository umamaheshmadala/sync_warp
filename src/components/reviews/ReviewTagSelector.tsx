// =====================================================
// Story 11.2.3: Progressive Tag Disclosure - Tag Selector
// =====================================================

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Tag } from 'lucide-react';
import { getTagsForCategory, getTagsUpToRound, type Tag as TagType } from '../../data/reviewTags';

interface ReviewTagSelectorProps {
  businessCategory?: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const MAX_ROUNDS = 3;

export default function ReviewTagSelector({
  businessCategory,
  selectedTags,
  onTagsChange,
}: ReviewTagSelectorProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [hasRevealed, setHasRevealed] = useState(false);

  // Get category-specific tags
  const tagCategory = useMemo(
    () => getTagsForCategory(businessCategory),
    [businessCategory]
  );

  // Get visible tags based on current round
  const visibleTags = useMemo(
    () => getTagsUpToRound(tagCategory, currentRound),
    [tagCategory, currentRound]
  );

  // Reveal next round when user selects a tag for the first time
  useEffect(() => {
    if (selectedTags.length > 0 && !hasRevealed && currentRound < MAX_ROUNDS) {
      setHasRevealed(true);
      setCurrentRound(2);
    }
  }, [selectedTags.length, hasRevealed, currentRound]);

  const toggleTag = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(t => t !== tagId)
      : [...selectedTags, tagId];

    onTagsChange(newTags);

    // Reveal more tags on selection if not at max
    if (!selectedTags.includes(tagId) && currentRound < MAX_ROUNDS) {
      setCurrentRound(prev => Math.min(prev + 1, MAX_ROUNDS));
      setHasRevealed(true);
    }
  };

  const handleShowMore = () => {
    if (currentRound < MAX_ROUNDS) {
      setCurrentRound(prev => prev + 1);
      setHasRevealed(true);
    }
  };

  const canShowMore = currentRound < MAX_ROUNDS;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-semibold text-gray-700">
            Tags <span className="font-normal text-gray-500">(optional)</span>
          </label>
        </div>
        {selectedTags.length > 0 && (
          <span className="text-xs text-gray-500">
            {selectedTags.length} selected
          </span>
        )}
      </div>

      {/* Tag Grid */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {visibleTags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag.id);
            const isNegative = tag.sentiment === 'negative';

            return (
              <motion.button
                key={tag.id}
                type="button"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.02, duration: 0.2 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleTag(tag.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                  border transition-colors
                  ${isSelected
                    ? isNegative
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                  }
                `}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show More Button */}
      {canShowMore && (
        <button
          type="button"
          onClick={handleShowMore}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Show more tags
        </button>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        {selectedTags.length === 0
          ? 'Select tags that describe your experience'
          : 'Keep selecting to see more options'}
      </p>
    </div>
  );
}
