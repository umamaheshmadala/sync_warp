/**
 * URL Utilities for Message Display
 * 
 * Provides functions for:
 * - Truncating long URLs for display (AC-14)
 * - Detecting internal vs external links (AC-16)
 * - Extracting URLs from text content
 */

/**
 * Truncates a URL for display, removing query parameters and shortening the path
 * 
 * @example
 * truncateUrl("http://localhost:5173/business/abc123?utm_source=sync&ref=xyz")
 * // Returns: "localhost:5173/business/abc123"
 * 
 * truncateUrl("https://sync.app/offers/very-long-offer-name-here?ref=abc", 30)
 * // Returns: "sync.app/offers/very-long-o..."
 */
export function truncateUrl(url: string, maxLength: number = 45): string {
    try {
        const urlObj = new URL(url, window.location.origin);

        // Build display URL: host + pathname (no protocol, no query params)
        let displayUrl = urlObj.host + urlObj.pathname;

        // Remove trailing slash if present
        if (displayUrl.endsWith('/')) {
            displayUrl = displayUrl.slice(0, -1);
        }

        // Truncate if exceeds maxLength
        if (displayUrl.length > maxLength) {
            return displayUrl.slice(0, maxLength - 3) + '...';
        }

        return displayUrl;
    } catch {
        // If URL parsing fails, just truncate the raw string
        if (url.length > maxLength) {
            return url.slice(0, maxLength - 3) + '...';
        }
        return url;
    }
}

/**
 * Checks if a URL is an internal link (same app domain)
 * Internal links should navigate within the app; external links open in new tab
 */
export function isInternalLink(url: string): boolean {
    const appDomains = [
        'sync.app',
        'www.sync.app',
        'localhost',
        '127.0.0.1',
    ];

    // Also include current host
    if (typeof window !== 'undefined') {
        appDomains.push(window.location.host);
    }

    try {
        const urlObj = new URL(url, window.location.origin);
        return appDomains.some(domain =>
            urlObj.host === domain || urlObj.host.endsWith('.' + domain)
        );
    } catch {
        // If URL parsing fails, check if it starts with a relative path
        return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
}

/**
 * Extracts the internal path from a URL for React Router navigation
 * 
 * @example
 * getInternalPath("http://localhost:5173/business/abc123?tab=offers")
 * // Returns: "/business/abc123?tab=offers"
 */
export function getInternalPath(url: string): string {
    try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
        // Return as-is if parsing fails
        return url;
    }
}

/**
 * URL match result from extractUrlsFromText
 */
export interface UrlMatch {
    url: string;
    start: number;
    end: number;
}

/**
 * Extracts all URLs from a text string
 * Returns array of matches with position information for rendering
 * 
 * @example
 * extractUrlsFromText("Check this out! http://sync.app/offers/123 and also https://example.com")
 * // Returns: [
 * //   { url: "http://sync.app/offers/123", start: 16, end: 41 },
 * //   { url: "https://example.com", start: 51, end: 70 }
 * // ]
 */
export function extractUrlsFromText(text: string): UrlMatch[] {
    // Comprehensive URL regex that matches:
    // - http:// and https:// URLs
    // - URLs with paths, query params, and fragments
    // - Common TLDs without protocol (e.g., "sync.app/offers")
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi;

    const matches: UrlMatch[] = [];
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
        let url = match[0];

        // Clean up trailing punctuation that might have been captured
        const trailingPunctuation = /[.,;:!?)]+$/;
        const trailingMatch = url.match(trailingPunctuation);
        if (trailingMatch) {
            url = url.slice(0, -trailingMatch[0].length);
        }

        // Add protocol if missing for non-http URLs
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

        matches.push({
            url: normalizedUrl,
            start: match.index,
            end: match.index + url.length, // Use original length before normalization
        });
    }

    return matches;
}

/**
 * Parses message content and splits it into text and URL segments
 * Returns an array of segments for rendering
 */
export interface ContentSegment {
    type: 'text' | 'url';
    content: string;
    fullUrl?: string; // Only for 'url' type - the complete URL for copying/navigation
}

export function parseMessageContent(content: string): ContentSegment[] {
    const urlMatches = extractUrlsFromText(content);

    if (urlMatches.length === 0) {
        return [{ type: 'text', content }];
    }

    const segments: ContentSegment[] = [];
    let lastIndex = 0;

    for (const match of urlMatches) {
        // Add text before this URL
        if (match.start > lastIndex) {
            const textContent = content.slice(lastIndex, match.start);
            if (textContent) {
                segments.push({ type: 'text', content: textContent });
            }
        }

        // Add the URL segment
        // Note: We use the original text from content for proper positioning
        const originalUrlText = content.slice(match.start, match.end);
        segments.push({
            type: 'url',
            content: originalUrlText,
            fullUrl: match.url, // Normalized URL with protocol
        });

        lastIndex = match.end;
    }

    // Add any remaining text after the last URL
    if (lastIndex < content.length) {
        segments.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return segments;
}
