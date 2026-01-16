/**
 * Share Friend Picker Modal - Story 10.1.2
 * Generalized friend picker for sharing any entity type
 * 
 * Features:
 * - Search for friends
 * - Recently shared with section
 * - Multi-select with checkboxes
 * - Optional custom message
 * - Uses unifiedShareService for tracking
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Clock, Send, Loader2 } from 'lucide-react';
import { useOptimizedSearch } from '../../hooks/useOptimizedSearch';
import { useFriends } from '../../hooks/friends/useFriends';
import { useUnifiedShare } from '../../hooks/useUnifiedShare';
import { ShareableEntityType } from '../../types/sharing';
import { toast } from 'react-hot-toast';

export interface ShareFriendPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: ShareableEntityType;
    entityId: string;
    entityData: {
        title: string;
        description?: string;
        imageUrl?: string;
        url: string;
    };
    onSuccess?: (friendIds: string[]) => void;
}

interface Friend {
    userId: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
}

export function ShareFriendPickerModal({
    isOpen,
    onClose,
    entityType,
    entityId,
    entityData,
    onSuccess,
}: ShareFriendPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [customMessage, setCustomMessage] = useState('');
    const [recentlySharedWithIds, setRecentlySharedWithIds] = useState<string[]>([]);

    const { shareToChat, isSharing } = useUnifiedShare();

    // Use optimized search hook
    const { data: searchData, isLoading: isSearching } = useOptimizedSearch(searchQuery);

    // Use friends hook to get all friends
    const { data: friendsResponse, isLoading: loadingAllFriends } = useFriends();

    // Load recently shared IDs from localStorage
    useEffect(() => {
        try {
            const recent = localStorage.getItem('recently_shared_with');
            if (recent) {
                const parsed = JSON.parse(recent);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setRecentlySharedWithIds(parsed.slice(0, 5));
                }
            }
        } catch (error) {
            console.error('Failed to load recently shared with:', error);
        }
    }, []);

    // Transform search results to Friend format
    const searchResults: Friend[] = useMemo(() => searchData?.results.map(result => ({
        userId: result.user_id,
        fullName: result.full_name,
        username: result.username,
        avatarUrl: result.avatar_url || undefined,
    })) || [], [searchData]);

    // Transform all friends data to Friend format
    const allFriends: Friend[] = useMemo(() => friendsResponse?.success && Array.isArray(friendsResponse.data)
        ? friendsResponse.data.map((profile: any) => ({
            userId: profile.id,
            fullName: profile.full_name,
            username: profile.username,
            avatarUrl: profile.avatar_url || undefined,
        }))
        : [], [friendsResponse]);

    // Derive recently shared users from allFriends list
    const recentlySharedUsers: Friend[] = useMemo(() => {
        if (recentlySharedWithIds.length === 0 || allFriends.length === 0) return [];

        const users: Friend[] = [];
        for (const id of recentlySharedWithIds) {
            const friend = allFriends.find(f => f.userId === id);
            if (friend) users.push(friend);
        }
        return users;
    }, [recentlySharedWithIds, allFriends]);

    // Display friends based on search query
    const displayFriends = searchQuery ? searchResults : allFriends;
    const isLoadingFriends = searchQuery ? isSearching : loadingAllFriends;

    const handleToggleFriend = (userId: string) => {
        setSelectedFriends(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleShare = async () => {
        if (selectedFriends.length === 0) return;

        try {
            const result = await shareToChat(
                {
                    entityType,
                    entityId,
                    entityData,
                },
                selectedFriends,
                customMessage || undefined
            );

            if (result.success) {
                // Update recently shared with
                const updated = [
                    ...selectedFriends,
                    ...recentlySharedWithIds.filter(id => !selectedFriends.includes(id)),
                ].slice(0, 5);

                localStorage.setItem('recently_shared_with', JSON.stringify(updated));
                setRecentlySharedWithIds(updated);

                toast.success(`Shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
                onSuccess?.(selectedFriends);
                onClose();

                // Reset state
                setSelectedFriends([]);
                setSearchQuery('');
                setCustomMessage('');
            } else {
                toast.error(result.error || 'Failed to share');
            }
        } catch (error) {
            console.error('Failed to share:', error);
            toast.error('Failed to share. Please try again.');
        }
    };

    const getEntityLabel = () => {
        switch (entityType) {
            case 'storefront': return 'business';
            case 'product': return 'product';
            case 'offer': return 'offer';
            case 'profile': return 'profile';
            default: return 'item';
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[10001] bg-black/50 flex items-end md:items-center justify-center"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full bg-white md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Send to Friends</h2>
                        <p className="text-sm text-gray-500">Share this {getEntityLabel()} with friends</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Entity Preview */}
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-3">
                        {entityData.imageUrl ? (
                            <img
                                src={entityData.imageUrl}
                                alt={entityData.title}
                                className="w-12 h-12 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Send className="w-6 h-6 text-purple-600" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{entityData.title}</p>
                            {entityData.description && (
                                <p className="text-sm text-gray-500 truncate">{entityData.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {/* Selected Friends Count */}
                    {selectedFriends.length > 0 && (
                        <div className="p-4 bg-purple-50 border-b">
                            <p className="text-sm font-medium text-purple-700">
                                {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                            </p>
                        </div>
                    )}

                    {/* Recently Shared With */}
                    {!searchQuery && recentlySharedUsers.length > 0 && (
                        <div className="p-4 border-b">
                            <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                                <Clock className="w-4 h-4 mr-2" />
                                Recent
                            </h3>
                            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
                                {recentlySharedUsers.map((user) => (
                                    <CompactFriendItem
                                        key={user.userId}
                                        name={user.fullName}
                                        avatarUrl={user.avatarUrl}
                                        isSelected={selectedFriends.includes(user.userId)}
                                        onToggle={() => handleToggleFriend(user.userId)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friends List */}
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {searchQuery ? 'Search Results' : 'All Friends'}
                        </h3>

                        {isLoadingFriends ? (
                            <div className="text-center py-8 text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                                <p className="mt-2">Loading...</p>
                            </div>
                        ) : displayFriends.length > 0 ? (
                            <div className="grid grid-cols-4 gap-4 sm:grid-cols-5">
                                {displayFriends.map((friend) => (
                                    <CompactFriendItem
                                        key={friend.userId}
                                        name={friend.fullName}
                                        avatarUrl={friend.avatarUrl}
                                        isSelected={selectedFriends.includes(friend.userId)}
                                        onToggle={() => handleToggleFriend(friend.userId)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                {searchQuery ? (
                                    <p>No friends found matching "{searchQuery}"</p>
                                ) : (
                                    <p>No friends yet. Add friends to share!</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Custom Message Input */}
                <div className="p-4 border-t">
                    <input
                        type="text"
                        placeholder="Add a message (optional)"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        maxLength={200}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white">
                    <button
                        onClick={handleShare}
                        disabled={selectedFriends.length === 0 || isSharing}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {isSharing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Sending...
                            </>
                        ) : selectedFriends.length === 0 ? (
                            'Select friends to share'
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Send to {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

/**
 * Helper to get initials from name
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/**
 * Compact Friend Item Component
 */
interface CompactFriendItemProps {
    name: string;
    avatarUrl?: string;
    isSelected: boolean;
    onToggle: () => void;
}

function CompactFriendItem({
    name,
    avatarUrl,
    isSelected,
    onToggle,
}: CompactFriendItemProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <button
            onClick={onToggle}
            className="flex flex-col items-center gap-2 w-16 group"
            title={name}
        >
            <div className="relative">
                {avatarUrl && !imageError ? (
                    <img
                        src={avatarUrl}
                        alt={name}
                        className={`w-12 h-12 rounded-full object-cover transition ${isSelected ? 'ring-2 ring-purple-600 ring-offset-2' : 'group-hover:ring-2 group-hover:ring-gray-200 group-hover:ring-offset-2'
                            }`}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className={`w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold transition ${isSelected ? 'ring-2 ring-purple-600 ring-offset-2' : 'group-hover:ring-2 group-hover:ring-gray-200 group-hover:ring-offset-2'
                        }`}>
                        {getInitials(name)}
                    </div>
                )}

                {isSelected && (
                    <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-0.5 border-2 border-white">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                )}
            </div>
            <span className="text-xs text-center font-medium text-gray-700 truncate w-full">
                {name.split(' ')[0]}
            </span>
        </button>
    );
}

export default ShareFriendPickerModal;
