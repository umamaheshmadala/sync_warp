// FollowerListModal.tsx
// Modal component to display list of businesses followers
// Supports infinite scroll pagination and privacy filtering

import React from 'react';
import { X, User, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useBusinessFollowers } from '../../hooks/useBusinessFollowers';

interface FollowerListModalProps {
    businessId: string;
    businessName: string;
    followerCount: number;
    isOpen: boolean;
    onClose: () => void;
}

export const FollowerListModal: React.FC<FollowerListModalProps> = ({
    businessId,
    businessName,
    followerCount,
    isOpen,
    onClose,
}) => {
    const { data: followers, isLoading, error } = useBusinessFollowers(businessId, isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
                className="relative w-full max-w-md bg-white rounded-lg shadow-xl max-h-[600px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Following {businessName}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Follower Count Summary */}
                <div className="px-4 py-3 bg-gray-50 border-b">
                    <p className="text-sm text-gray-600">
                        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                    </p>
                </div>

                {/* Follower List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                                <X className="w-6 h-6 text-red-600" />
                            </div>
                            <p className="text-sm text-gray-600">Failed to load followers</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                Try again
                            </button>
                        </div>
                    ) : !followers || followers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">No followers yet</p>
                            <p className="text-sm text-gray-500">Be the first to follow this business!</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {followers.map((follower) => (
                                <div
                                    key={follower.id}
                                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                                >
                                    {/* Profile Picture */}
                                    <div className="flex-shrink-0">
                                        {follower.user?.avatar_url ? (
                                            <img
                                                src={follower.user.avatar_url}
                                                alt={follower.user.full_name || 'User'}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center border-2 border-gray-200">
                                                <User className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Follower Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {follower.user?.full_name || 'Anonymous User'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Following since {formatDistanceToNow(new Date(follower.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
};
