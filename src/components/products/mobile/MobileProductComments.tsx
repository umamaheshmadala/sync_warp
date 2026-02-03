import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface Comment {
    id: string;
    username: string;
    text: string;
    timeAgo: string;
}

interface MobileProductCommentsProps {
    comments?: Comment[]; // Optional for now
    totalCount?: number;
    onViewAll?: () => void;
    onAddComment?: (text: string) => void;
}

export const MobileProductComments: React.FC<MobileProductCommentsProps> = ({
    comments = [],
    totalCount = 0,
    onViewAll,
    onAddComment
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            if (onAddComment) onAddComment(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            {/* View All Header */}
            {totalCount > 0 && (
                <button
                    onClick={onViewAll}
                    className="text-gray-500 dark:text-gray-400 text-sm mb-3 block"
                >
                    View all {totalCount} comments
                </button>
            )}

            {/* Comment Previews */}
            <div className="space-y-3 mb-4">
                {comments.slice(0, 2).map((comment) => (
                    <div key={comment.id} className="text-sm">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 mr-2">
                            {comment.username}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                            {comment.text}
                        </span>
                        {/* <span className="text-xs text-gray-400 ml-2 block sm:inline">{comment.timeAgo}</span> */}
                    </div>
                ))}
            </div>

            {/* Input Row */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3 mt-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" /> {/* Avatar Placeholder */}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none py-1"
                    />
                </div>
                {inputValue.trim() && (
                    <button
                        type="submit"
                        className="text-blue-600 dark:text-blue-400 font-semibold text-sm"
                    >
                        Post
                    </button>
                )}
            </form>
        </div>
    );
};
