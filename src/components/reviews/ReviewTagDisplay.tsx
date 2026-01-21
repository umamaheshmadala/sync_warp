// =====================================================
// Story 11.2.3: Review Tag Display Component
// =====================================================

import React from 'react';
import { TAG_LOOKUP_MAP } from '../../data/reviewTags';

interface ReviewTagDisplayProps {
    tagIds: string[];
    maxVisible?: number;
    size?: 'sm' | 'md';
}

export default function ReviewTagDisplay({
    tagIds,
    maxVisible = 5,
    size = 'sm'
}: ReviewTagDisplayProps) {
    if (!tagIds || tagIds.length === 0) return null;

    const visibleTags = tagIds.slice(0, maxVisible);
    const hiddenCount = tagIds.length - maxVisible;

    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-xs'
        : 'px-3 py-1 text-sm';

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {visibleTags.map(tagId => {
                const tag = TAG_LOOKUP_MAP.get(tagId);

                // If tag not found in lookup, show just the ID
                if (!tag) {
                    return (
                        <span
                            key={tagId}
                            className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 ${sizeClasses}`}
                        >
                            {tagId}
                        </span>
                    );
                }

                return (
                    <span
                        key={tagId}
                        className={`
              inline-flex items-center gap-1 rounded-full
              ${sizeClasses}
              ${tag.sentiment === 'negative'
                                ? 'bg-red-100 text-red-700'
                                : tag.sentiment === 'positive'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                            }
            `}
                    >
                        <span>{tag.icon}</span>
                        <span>{tag.label}</span>
                    </span>
                );
            })}

            {hiddenCount > 0 && (
                <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-500 ${sizeClasses}`}>
                    +{hiddenCount} more
                </span>
            )}
        </div>
    );
}
