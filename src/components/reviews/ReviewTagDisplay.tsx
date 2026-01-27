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
    maxVisible = 3,
    size = 'sm'
}: ReviewTagDisplayProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    if (!tagIds || tagIds.length === 0) return null;

    const visibleTags = isExpanded ? tagIds : tagIds.slice(0, maxVisible);
    const hiddenCount = tagIds.length - maxVisible;

    const sizeClasses = size === 'sm'
        ? 'px-2.5 py-1 text-xs'
        : 'px-3 py-1 text-sm';

    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {visibleTags.map(tagId => {
                const tag = TAG_LOOKUP_MAP.get(tagId);

                // If tag not found in lookup, show just the ID
                if (!tag) {
                    return (
                        <span
                            key={tagId}
                            className={`inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100 ${sizeClasses}`}
                        >
                            {tagId}
                        </span>
                    );
                }

                return (
                    <span
                        key={tagId}
                        className={`
              inline-flex items-center gap-1.5 rounded-full border
              ${sizeClasses}
              ${tag.sentiment === 'negative'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : tag.sentiment === 'positive'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : 'bg-gray-50 text-gray-700 border-gray-100'
                            }
            `}
                    >
                        <span className="opacity-75">{tag.icon}</span>
                        <span className="font-medium">{tag.label || tagId}</span>
                    </span>
                );
            })}

            {!isExpanded && hiddenCount > 0 && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className={`inline-flex items-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200 transition-colors ${sizeClasses}`}
                >
                    +{hiddenCount} more
                </button>
            )}
        </div>
    );
}
