import React from 'react';

interface HighlightedTextProps {
    text: string;
    highlight: string;
}

export function HighlightedText({ text, highlight }: HighlightedTextProps) {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }

    // Escape special regex characters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedHighlight = escapeRegex(highlight);

    // Split text by highlight term (case insensitive)
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, index) => {
                const isMatch = part.toLowerCase() === highlight.toLowerCase();
                return isMatch ? (
                    <mark
                        key={index}
                        className="bg-yellow-200 dark:bg-yellow-800 font-semibold px-0.5 rounded"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                );
            })}
        </span>
    );
}
