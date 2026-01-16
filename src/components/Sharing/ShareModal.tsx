// src/components/sharing/ShareModal.tsx
// Generic Share Modal Component - Story 10.1.2
// Reusable for storefronts, products, offers, profiles

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Share2,
    MessageCircle,
    Link,
    Facebook,
    Twitter,
    Mail,
    Copy,
    Check,
    MoreHorizontal,
    Users,
    Loader2,
} from 'lucide-react';
import { useUnifiedShare } from '../../hooks/useUnifiedShare';
import { ShareableEntityType } from '../../types/sharing';
import { ShareFriendPickerModal } from './ShareFriendPickerModal';
import { toast } from 'react-hot-toast';

export interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: ShareableEntityType;
    entityId: string;
    title: string;
    description?: string;
    imageUrl?: string;
    url: string;
    onShareSuccess?: () => void;
}

export function ShareModal({
    isOpen,
    onClose,
    entityType,
    entityId,
    title,
    description,
    imageUrl,
    url,
    onShareSuccess,
}: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [showFriendPicker, setShowFriendPicker] = useState(false);

    const {
        shareClipboard,
        shareToPlatform,
        shareNative,
        isSharing,
        isNativeShareSupported,
        isMobile,
        error,
    } = useUnifiedShare();

    // Build the full share URL
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

    // Share options configuration
    const shareOptions = {
        entityType,
        entityId,
        entityData: {
            title,
            description: description || '',
            imageUrl,
            url: fullUrl,
        },
    };

    const handleCopyLink = async () => {
        try {
            const result = await shareClipboard(shareOptions);
            if (result.success) {
                setCopied(true);
                toast.success('Link copied to clipboard!');
                setTimeout(() => setCopied(false), 2000);
                onShareSuccess?.();
            }
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    const handleSendToFriend = () => {
        setShowFriendPicker(true);
    };

    const handleFacebookShare = async () => {
        try {
            await shareToPlatform(shareOptions, 'facebook');
            onShareSuccess?.();
        } catch (err) {
            toast.error('Failed to share to Facebook');
        }
    };

    const handleTwitterShare = async () => {
        try {
            await shareToPlatform(shareOptions, 'twitter');
            onShareSuccess?.();
        } catch (err) {
            toast.error('Failed to share to Twitter');
        }
    };

    const handleWhatsAppShare = async () => {
        try {
            await shareToPlatform(shareOptions, 'whatsapp');
            onShareSuccess?.();
        } catch (err) {
            toast.error('Failed to share to WhatsApp');
        }
    };

    const handleEmailShare = async () => {
        try {
            await shareToPlatform(shareOptions, 'email');
            onShareSuccess?.();
        } catch (err) {
            toast.error('Failed to share via email');
        }
    };

    const handleNativeShare = async () => {
        try {
            const result = await shareNative(shareOptions);
            if (result.success) {
                toast.success('Shared successfully!');
                onShareSuccess?.();
                onClose();
            }
        } catch (err) {
            // User may have cancelled, not necessarily an error
            console.log('Native share cancelled or failed');
        }
    };

    // Get entity-specific header text
    const getHeaderText = () => {
        switch (entityType) {
            case 'storefront':
                return 'Share Business';
            case 'product':
                return 'Share Product';
            case 'offer':
                return 'Share Offer';
            case 'profile':
                return 'Share Profile';
            default:
                return 'Share';
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{getHeaderText()}</h2>
                            <p className="text-sm text-gray-500">Share with friends</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Close share modal"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Entity Preview */}
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-start gap-4">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={title}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                                <Share2 className="w-8 h-8 text-purple-600" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                {title}
                            </h3>
                            {description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Share Options */}
                <div className="p-6">
                    <div className="space-y-3">
                        {/* Send to Friend - Primary action */}
                        <button
                            onClick={handleSendToFriend}
                            disabled={isSharing}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-colors disabled:opacity-50"
                        >
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-900">Send to Friend</p>
                                <p className="text-sm text-gray-500">Share via chat</p>
                            </div>
                        </button>

                        {/* Copy Link */}
                        <button
                            onClick={handleCopyLink}
                            disabled={isSharing}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                        >
                            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                                {copied ? (
                                    <Check className="w-6 h-6 text-white" />
                                ) : (
                                    <Link className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-900">
                                    {copied ? 'Link Copied!' : 'Copy Link'}
                                </p>
                                <p className="text-sm text-gray-500 truncate">{fullUrl}</p>
                            </div>
                        </button>

                        {/* Social Share Buttons - Horizontal Grid */}
                        <div className="grid grid-cols-4 gap-3 pt-2">
                            {/* Facebook */}
                            <button
                                onClick={handleFacebookShare}
                                disabled={isSharing}
                                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                                aria-label="Share on Facebook"
                            >
                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                    <Facebook className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-xs text-gray-600">Facebook</span>
                            </button>

                            {/* Twitter */}
                            <button
                                onClick={handleTwitterShare}
                                disabled={isSharing}
                                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
                                aria-label="Share on Twitter"
                            >
                                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                                    <Twitter className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-xs text-gray-600">Twitter</span>
                            </button>

                            {/* WhatsApp */}
                            <button
                                onClick={handleWhatsAppShare}
                                disabled={isSharing}
                                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                aria-label="Share on WhatsApp"
                            >
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                    <MessageCircle className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-xs text-gray-600">WhatsApp</span>
                            </button>

                            {/* Email */}
                            <button
                                onClick={handleEmailShare}
                                disabled={isSharing}
                                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                                aria-label="Share via Email"
                            >
                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-xs text-gray-600">Email</span>
                            </button>
                        </div>

                        {/* Native Share - Mobile Only */}
                        {isNativeShareSupported && isMobile && (
                            <button
                                onClick={handleNativeShare}
                                disabled={isSharing}
                                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 mt-3"
                            >
                                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                                    {isSharing ? (
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    ) : (
                                        <MoreHorizontal className="w-6 h-6 text-white" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-gray-900">More Options</p>
                                    <p className="text-sm text-gray-500">Open share sheet</p>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-6 pb-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">{error.message}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Friend Picker Modal */}
            <ShareFriendPickerModal
                isOpen={showFriendPicker}
                onClose={() => setShowFriendPicker(false)}
                entityType={entityType}
                entityId={entityId}
                entityData={{
                    title,
                    description: description || '',
                    imageUrl,
                    url: fullUrl,
                }}
                onSuccess={() => {
                    setShowFriendPicker(false);
                    onShareSuccess?.();
                    onClose();
                }}
            />
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default ShareModal;
