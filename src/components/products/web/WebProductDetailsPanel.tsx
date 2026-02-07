import React, { useState } from 'react';
import { MessageCircle, Share2, MoreHorizontal, Loader2, Bell, BellOff, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../../../types/product';
import { useAuthStore } from '../../../store/authStore';
import { useProductLike } from '../../../hooks/useProductLike';
import { useProductComments } from '../../../hooks/useProductComments';
import { useProductFavorite } from '../../../hooks/useProductFavorite';
import { useProducts } from '../../../hooks/useProducts';
import { ProductLikeButton } from '../social/ProductLikeButton';
import { ProductLikedBy } from '../social/ProductLikedBy';
import { ProductCommentItem } from '../social/ProductCommentItem';
import { ProductCommentInput } from '../social/ProductCommentInput';
import { ProductFavoriteButton } from '../actions/ProductFavoriteButton';
import { ProductShareButton } from '../../Sharing/ProductShareButton';
import { ProductTagDisplay } from '../tags/ProductTagDisplay';
import { ProductDescription } from '../details/ProductDescription';
import { ProductNotificationToggle } from '../controls/ProductNotificationToggle';

import { useProductWizardStore } from '../../../stores/useProductWizardStore';
import { Edit3, Trash2 } from 'lucide-react';

interface WebProductDetailsPanelProps {
    product: Product;
    isOwner: boolean;
    onClose: () => void;
    onArchive?: (productId: string) => Promise<boolean>;
    onUnarchive?: (productId: string) => Promise<boolean>;
    onDelete?: (productId: string) => Promise<boolean>;
}

export const WebProductDetailsPanel: React.FC<WebProductDetailsPanelProps> = ({
    product,
    isOwner,
    onClose,
    onArchive,
    onUnarchive,
    onDelete
}) => {
    // Likes Logic
    const { isLiked, likeCount, likedByFriends, toggleLike } = useProductLike(product.id, product.like_count || 0);
    // Comments Logic
    const { comments, loading: commentsLoading, postComment, deleteComment } = useProductComments(product.id);
    // Favorite Logic
    const { isFavorite, toggleFavorite, isLoading: isFavLoading } = useProductFavorite(product.id);

    // Edit Logic
    const { openWizard } = useProductWizardStore();
    const [showMenu, setShowMenu] = useState(false);

    // Notification state
    const { updateNotificationSetting } = useProducts();
    const [notificationsEnabled, setNotificationsEnabled] = useState(product.notifications_enabled ?? true);
    const [updatingNotification, setUpdatingNotification] = useState(false);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const { user } = useAuthStore();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Derived Business Info
    const businessName = (product.businesses as any)?.business_name || 'Business Name';
    const businessLogo = (product.businesses as any)?.logo_url;

    const handleShare = () => toast.success('Shared (Demo)', { icon: '🔗' });
    const handleReport = (id: string) => console.log('Report', id); // Mock

    // Description Truncation
    const description = product.description || '';
    const shouldTruncate = description.length > 120;
    const displayDescription = isDescriptionExpanded || !shouldTruncate
        ? description
        : description.slice(0, 120) + '...';

    const handleEditProduct = () => {
        onClose(); // Close modal first
        openWizard(product.business_id, undefined, product);
    };

    const handleArchive = async () => {
        if (!onArchive) return;
        setShowMenu(false);
        const success = await onArchive(product.id);
        if (success) {
            onClose(); // Close modal on archive
        }
    };

    const handleUnarchive = async () => {
        if (!onUnarchive) return;
        setShowMenu(false);
        const success = await onUnarchive(product.id);
        if (success) onClose();
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!isDeleting) setIsDeleting(true);
        const success = await onDelete(product.id);
        setIsDeleting(false);
        if (success) {
            setShowDeleteConfirm(false);
            onClose();
        }
    };

    const handleNotificationToggle = async () => {
        if (updatingNotification) return;
        setUpdatingNotification(true);
        const newState = !notificationsEnabled;
        setNotificationsEnabled(newState); // Optimistic
        try {
            const success = await updateNotificationSetting(product.id, newState);
            if (!success) {
                setNotificationsEnabled(!newState); // Revert
            }
        } catch {
            setNotificationsEnabled(!newState); // Revert
        } finally {
            setUpdatingNotification(false);
        }
    };

    // Check if product was edited (updated_at > created_at + 1 minute)
    const isEdited = product.updated_at && product.created_at &&
        new Date(product.updated_at).getTime() > new Date(product.created_at).getTime() + 60000;

    const hasInteractions = (likeCount > 0 || comments.length > 0);
    const canDelete = !hasInteractions || deleteInput === 'DELETE';

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-100 relative" onClick={() => setShowMenu(false)}>
            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Product?</h3>

                            {hasInteractions ? (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        This product has <strong>{likeCount} likes</strong> and <strong>{comments.length} comments</strong>.
                                        Deleting it will permanently remove all data. This cannot be undone.
                                    </p>
                                    <p className="text-xs text-gray-400 mb-2">Type <strong>DELETE</strong> to confirm:</p>
                                    <input
                                        type="text"
                                        value={deleteInput}
                                        onChange={(e) => setDeleteInput(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md mb-4 text-center tracking-widest uppercase font-bold dark:bg-gray-800 dark:border-gray-700"
                                        placeholder="DELETE"
                                        autoFocus
                                    />
                                </>
                            ) : (
                                <p className="text-sm text-gray-500 mb-6">
                                    Are you sure you want to delete this product? This action cannot be undone.
                                </p>
                            )}

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={!canDelete || isDeleting}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 relative">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        {businessLogo ? (
                            <img src={businessLogo} alt={businessName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                {businessName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900 hover:underline cursor-pointer">
                            {businessName}
                        </div>
                    </div>
                    <button className="text-blue-500 text-xs font-semibold ml-2 hover:text-blue-600">
                        Follow
                    </button>
                </div>

                {/* Menu Action */}
                {isOwner && (
                    <div className="relative">
                        <button
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                        >
                            <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditProduct();
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Edit Product
                                </button>

                                {product.status === 'archived' ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnarchive();
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Unarchive
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleArchive();
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                                    >
                                        <Archive className="w-4 h-4" />
                                        Archive
                                    </button>
                                )}

                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Product
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {!isOwner && product.status !== 'draft' && (
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                        <MoreHorizontal className="w-5 h-5 text-gray-600" />
                    </button>
                )}
            </div>

            {/* Scrollable Content (Comments & Description) */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                {/* Product Info */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-gray-900">
                                {product.name}
                            </h1>
                            {isEdited && (
                                <span className="text-xs text-gray-400 italic">(edited)</span>
                            )}
                            {/* Archived Badge */}
                            {product.status === 'archived' && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                                    Archived
                                </span>
                            )}
                        </div>
                        {/* Notification Bell for Owners */}
                        {isOwner && (
                            <button
                                onClick={handleNotificationToggle}
                                disabled={updatingNotification}
                                className={`p-1.5 rounded-full transition-colors ${notificationsEnabled
                                    ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                title={notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
                            >
                                {updatingNotification ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : notificationsEnabled ? (
                                    <Bell className="w-5 h-5" />
                                ) : (
                                    <BellOff className="w-5 h-5" />
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <ProductTagDisplay product={product} size="sm" />
                    </div>

                    {product.status === 'sold_out' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full dark:bg-gray-800">
                            Sold Out
                        </span>
                    )}
                </div>

                {/* Description */}
                <ProductDescription
                    text={product.description}
                    maxLength={120}
                    className="mt-2"
                />

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {product.tags.map(tag => (
                            <span key={tag} className="text-xs text-blue-600">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}


                <div className="h-px bg-gray-100 my-2" />

                {/* Comments List - Hidden for Drafts */}
                {product.status !== 'draft' && (
                    <div className="space-y-4 pb-4">
                        {commentsLoading && comments.length === 0 ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                            </div>
                        ) : (
                            comments.map(comment => (
                                <ProductCommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onDelete={deleteComment}
                                    onReport={handleReport}
                                />
                            ))
                        )}

                        {comments.length === 0 && !commentsLoading && (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="text-4xl mb-2">💭</div>
                                <h3 className="font-semibold text-gray-900">No comments yet</h3>
                                <p className="text-sm text-gray-500">Start the conversation.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Owner Controls - Notification Toggle moved to header bell icon */}
            </div>

            {/* Sticky Bottom Actions & Input - Disabled if Archived, Hidden if Draft */}
            {product.status !== 'draft' && (
                <div className={`border-t border-gray-100 bg-white p-4 pb-3 ${product.status === 'archived' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    {/* Actions Row */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                            <ProductLikeButton
                                isLiked={isLiked}
                                onToggle={toggleLike}
                                size={24}
                            />
                            <button className="group" onClick={() => document.getElementById('web-comment-input')?.focus()}>
                                <MessageCircle className="w-6 h-6 text-gray-900 group-hover:text-blue-500 transition-colors" />
                            </button>
                            <ProductShareButton
                                productId={product.id}
                                productName={product.name}
                                productDescription={product.description}
                                productImage={product.image_urls?.[0] || product.image_url}
                                businessId={product.business_id}
                                businessName={businessName}
                                businessLogo={businessLogo}
                                variant="icon"
                                className="text-gray-900 hover:text-green-500 transition-colors bg-transparent shadow-none"
                            />
                        </div>
                        {/* Favorite Button */}
                        <ProductFavoriteButton
                            isFavorite={isFavorite}
                            onToggle={toggleFavorite}
                            isLoading={isFavLoading}
                            size={24}
                        />
                    </div>

                    {/* Liked By */}
                    <div className="mb-2">
                        <ProductLikedBy
                            friends={likedByFriends}
                            totalLikes={likeCount}
                        />
                    </div>

                    {/* Time Stamp - (edited) indicator moved to product name area */}
                    <div className="text-[10px] uppercase text-gray-400 mb-3 tracking-wide">
                        <span>{new Date(product.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                    </div>

                    {/* Comment Input */}
                    <div className="border-t border-gray-100 pt-3">
                        <ProductCommentInput
                            onPost={postComment}
                            id="web-comment-input"
                        />
                    </div>
                </div>
            )}
        </div >
    );
};
