import React, { useState } from 'react';
import {
    MoreVertical,
    Share2,
    UserPlus,
    UserCheck,
    Bell,
    Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useUnifiedShare } from '../../hooks/useUnifiedShare';
import { useBusinessFollowing } from '../../hooks/useBusinessFollowing';
import { ShareModal } from '../Sharing/ShareModal';
import NotificationPreferencesModal from '../following/NotificationPreferencesModal';
import { toast } from 'react-hot-toast';

interface BusinessActionMenuProps {
    businessId: string;
    businessName: string;
    businessImageUrl?: string;
    businessDescription?: string;
    className?: string;
}

export function BusinessActionMenu({
    businessId,
    businessName,
    businessImageUrl,
    businessDescription,
    className
}: BusinessActionMenuProps) {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    const { isFollowing, followBusiness, unfollowBusiness, followedBusinesses } = useBusinessFollowing();

    // Safe following check - hooks might return undefined during initial load
    const isFollowed = isFollowing ? isFollowing(businessId) : false;

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isFollowLoading) return;

        setIsFollowLoading(true);
        try {
            if (isFollowed) {
                await unfollowBusiness(businessId, businessName);
            } else {
                await followBusiness(businessId, businessName);
                toast.success(`You are now following ${businessName}`);
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            toast.error('Failed to update follow status');
        } finally {
            setIsFollowLoading(false);
            // Keep menu open to allow further actions or close it? 
            // Standard behavior is usually to close after action, but for follow toggle usually we might want to keep it open 
            // IF we want them to immediately set notifications.
            // However, DropdownMenuItem usually closes on click. We can prevent that with e.preventDefault() but let's stick to standard closings for now.
        }
    };

    const currentPreferences = followedBusinesses?.find(fb => fb.business_id === businessId)?.notification_preferences;
    const currentChannel = followedBusinesses?.find(fb => fb.business_id === businessId)?.notification_channel;

    return (
        <>
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full hover:bg-gray-100 ${className}`}
                    >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                        <span className="sr-only">Business actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {/* Share Option */}
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            setIsShareModalOpen(true);
                        }}
                        className="cursor-pointer"
                    >
                        <Share2 className="mr-2 h-4 w-4" />
                        <span className="font-bold">Share</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Follow/Unfollow Option */}
                    <DropdownMenuItem
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        className="cursor-pointer"
                    >
                        {isFollowLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isFollowed ? (
                            <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                        ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        <span className="font-bold">{isFollowed ? 'Unfollow' : 'Follow'}</span>
                    </DropdownMenuItem>

                    {/* Notification Settings (Only if following) */}
                    {isFollowed && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                setIsNotificationModalOpen(true);
                            }}
                            className="cursor-pointer"
                        >
                            <Bell className="mr-2 h-4 w-4" />
                            <span className="font-bold">Notifications</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modals are rendered outside the dropdown to prevent issues */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                entityType="storefront"
                entityId={businessId}
                title={businessName}
                description={businessDescription}
                imageUrl={businessImageUrl}
                url={window.location.origin + `/business/${businessId}/${encodeURIComponent(businessName)}`}
            />

            {isFollowed && (
                <NotificationPreferencesModal
                    businessId={businessId}
                    businessName={businessName}
                    isOpen={isNotificationModalOpen}
                    onClose={() => setIsNotificationModalOpen(false)}
                    currentPreferences={currentPreferences}
                    currentChannel={currentChannel}
                />
            )}
        </>
    );
}
