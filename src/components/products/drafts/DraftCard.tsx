import React from 'react';
import { ProductDraft } from '../../types/productWizard'; // Adjust path
import { Image, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DraftCardProps {
    draft: ProductDraft;
    onResume: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({ draft, onResume, onDelete }) => {
    const coverImage = draft.images[0]?.preview || draft.images[0]?.url;

    return (
        <div
            onClick={onResume}
            className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="aspect-[4/5] w-full bg-gray-100 dark:bg-gray-700 relative">
                {coverImage ? (
                    <img src={coverImage} alt="Draft preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="w-8 h-8" />
                    </div>
                )}

                {/* Image Count Badge */}
                {draft.images.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {draft.images.length}
                    </div>
                )}

                {/* Delete Button */}
                <button
                    onClick={onDelete}
                    className="absolute bottom-2 right-2 p-1.5 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 backdrop-blur-sm"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {draft.name || 'Untitled Draft'}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{draft.updatedAt ? formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true }) : 'Just now'}</span>
                </div>
            </div>
        </div>
    );
};
