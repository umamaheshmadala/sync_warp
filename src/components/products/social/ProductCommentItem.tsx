import React, { useState } from 'react';
import { MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { ProductComment } from '../../../services/productCommentService';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

interface ProductCommentItemProps {
    comment: ProductComment;
    onDelete: (id: string) => void;
    onReport: (id: string) => void;
    isBusinessOwner?: boolean;
}

export const ProductCommentItem: React.FC<ProductCommentItemProps> = ({ comment, onDelete, onReport, isBusinessOwner }) => {
    const { user } = useAuthStore();
    const isOwnComment = user?.id === comment.user_id;
    const canDelete = isOwnComment || isBusinessOwner;
    const [showMenu, setShowMenu] = useState(false);

    const timeAgo = new Date(comment.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });

    const handleDelete = () => {
        if (window.confirm('Delete this comment?')) {
            onDelete(comment.id);
        }
        setShowMenu(false);
    };

    const handleReport = () => {
        onReport(comment.id);
        setShowMenu(false);
        toast.success('Comment reported. We will review it.');
    };

    console.log(`ProductCommentItem ${comment.id}: isOwn=${isOwnComment}, isBizOwner=${isBusinessOwner}, canDelete=${canDelete}`);

    return (
        <div className="flex gap-3 items-start group relative">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                {comment.user?.avatar_url ? (
                    <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {comment.user?.full_name?.charAt(0) || '?'}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white mr-2 hover:underline cursor-pointer">
                        {comment.user?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">
                        {comment.content}
                    </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{timeAgo}</span>
                    {/* Only show 'Reply' if we support it later. For now, flat structure. */}
                    {/* <button className="font-semibold hover:text-gray-600">Reply</button> */}

                    {/* Options Trigger (Always visible, relative for dropdown) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={`hover:text-gray-600 dark:hover:text-gray-300 ${showMenu ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div className="absolute left-0 sm:left-auto sm:right-0 top-6 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20 flex flex-col text-sm">
                                    {canDelete ? (
                                        <button onClick={handleDelete} className="text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-500 flex items-center gap-2 w-full">
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    ) : (
                                        <button onClick={handleReport} className="text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-orange-500 flex items-center gap-2 w-full">
                                            <Flag className="w-4 h-4" /> Report
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Like Heart (Static/Placeholder) */}
            <button className="pt-1 opacity-50 hover:opacity-100 transition-opacity">
                {/* <Heart className="w-3 h-3 text-gray-400 hover:text-red-500" /> */}
            </button>
        </div>
    );
};
