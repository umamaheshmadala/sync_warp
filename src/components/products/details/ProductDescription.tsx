
import React, { useState } from 'react';
import { linkifyText } from '../../../utils/linkify';
import { cn } from '../../../lib/utils';

interface ProductDescriptionProps {
    text?: string;
    maxLength?: number;
    className?: string;
}

export const ProductDescription: React.FC<ProductDescriptionProps> = ({
    text = '',
    maxLength = 100,
    className
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) return null;

    const shouldTruncate = text.length > maxLength;
    const displayText = isExpanded || !shouldTruncate ? text : text.slice(0, maxLength);

    // If truncated, we need to handle the display carefully effectively
    // We linkify the DISPLAY text. 
    // Note: If we slice in the middle of a URL, linkify might break or show partial URL.
    // For simplicity efficiently: slice raw text first, then linkify. 
    // Edge case: Slicing cuts a URL in half. 
    // Improved approach for future: Linkify first, then truncate array? Complex.
    // Current approach: Simple slice. If it breaks a URL, user clicks 'Read more' to see full.

    return (
        <div className={cn("text-sm text-gray-800 whitespace-pre-wrap", className)}>
            {linkifyText(displayText)}
            {!isExpanded && shouldTruncate && <span>... </span>}

            {shouldTruncate && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium ml-1 text-xs"
                >
                    {isExpanded ? 'Show less' : 'Read more'}
                </button>
            )}
        </div>
    );
};
