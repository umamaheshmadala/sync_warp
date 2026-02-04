
import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Converts text containing URLs into an array of strings and JSX link elements.
 * URLs are truncated for display if they are too long.
 */
export const linkifyText = (text: string): (string | JSX.Element)[] => {
    if (!text) return [];

    const parts = text.split(URL_REGEX);
    return parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()} // Prevent bubble up (e.g. to card click)
                >
                    {truncateUrl(part)}
                </a>
            );
        }
        return part;
    });
};

const truncateUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const display = urlObj.hostname + (urlObj.pathname === '/' ? '' : urlObj.pathname);
        return display.length > 30 ? display.slice(0, 30) + '...' : display;
    } catch {
        return url.length > 30 ? url.slice(0, 30) + '...' : url;
    }
};
