import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { LinkPreview } from '../../types/messaging';

interface ReviewLinkPreviewProps {
    preview: LinkPreview;
}

export function ReviewLinkPreview({ preview }: ReviewLinkPreviewProps) {
    const navigate = useNavigate();
    const metadata = preview.metadata || {};
    const isRecommend = metadata.recommendation === true;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling if nested
        const url = new URL(preview.url);
        navigate(`${url.pathname}${url.hash}`);
    };

    return (
        <div
            onClick={handleClick}
            className="border rounded-lg overflow-hidden bg-white cursor-pointer hover:bg-gray-50 transition-colors w-full max-w-sm shadow-sm"
        >
            {/* Business image */}
            {preview.image && (
                <div className="h-32 overflow-hidden bg-gray-100">
                    <img
                        src={preview.image}
                        alt="Business"
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="p-3 space-y-2">
                {/* Recommendation badge */}
                <div className={cn(
                    'inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium',
                    isRecommend
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                )}>
                    {isRecommend ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                    {isRecommend ? 'Recommends' : "Doesn't Recommend"}
                </div>

                {/* Review title */}
                <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{preview.title}</h4>

                {/* Excerpt */}
                {preview.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 italic">
                        "{preview.description}"
                    </p>
                )}

                {/* View link */}
                <div className="pt-1">
                    <span className="text-xs text-blue-600 font-medium hover:underline">Tap to view full review →</span>
                </div>
            </div>
        </div>
    );
}
