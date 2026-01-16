import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareModal } from './ShareModal';
import { cn } from '@/lib/utils';

interface ProfileShareButtonProps {
    userId: string;
    fullName: string;
    avatarUrl?: string;
    isOwnProfile?: boolean;
    isPrivate?: boolean;
    variant?: 'default' | 'icon' | 'ghost' | 'outline';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    showLabel?: boolean;
    label?: string;
    onShareSuccess?: () => void;
}

/**
 * ProfileShareButton - Story 10.1.5
 * 
 * Share button for user profiles with privacy-awareness.
 * - Own profile: Always fully shareable
 * - Other profiles: Respect privacy settings (external share blocked for private)
 */
export function ProfileShareButton({
    userId,
    fullName,
    avatarUrl,
    isOwnProfile = false,
    isPrivate = false,
    variant = 'icon',
    size = 'icon',
    className,
    showLabel = false,
    label = 'Share',
    onShareSuccess,
}: ProfileShareButtonProps) {
    const [showModal, setShowModal] = useState(false);

    // Prepare share data based on privacy
    const shareTitle = useMemo(() => {
        if (isPrivate && !isOwnProfile) {
            return 'SynC User';
        }
        return fullName;
    }, [fullName, isPrivate, isOwnProfile]);

    const shareDescription = useMemo(() => {
        if (isOwnProfile) {
            return 'Check out my profile on SynC!';
        }
        if (isPrivate) {
            return 'This profile is private - connect on SynC to see more';
        }
        return `${fullName} is on SynC - Connect with them!`;
    }, [fullName, isOwnProfile, isPrivate]);

    const shareImageUrl = useMemo(() => {
        // For private profiles (not own), hide avatar
        if (isPrivate && !isOwnProfile) {
            return undefined;
        }
        return avatarUrl;
    }, [avatarUrl, isPrivate, isOwnProfile]);

    const shareUrl = useMemo(() => {
        return `/profile/${userId}`;
    }, [userId]);

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowModal(true);
    };

    return (
        <>
            <Button
                variant={variant === 'icon' ? 'ghost' : variant as any}
                size={size}
                className={cn(variant === 'icon' ? 'rounded-full' : '', className)}
                onClick={handleShare}
                title={isOwnProfile ? 'Share my profile' : `Share ${fullName}'s profile`}
            >
                <Share2 className={cn('h-4 w-4', showLabel && 'mr-2')} />
                {showLabel && label}
            </Button>

            <ShareModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                entityType="profile"
                entityId={userId}
                title={shareTitle}
                description={shareDescription}
                imageUrl={shareImageUrl}
                url={shareUrl}
                isPrivate={isPrivate && !isOwnProfile}
                onShareSuccess={onShareSuccess}
            />
        </>
    );
}

export default ProfileShareButton;
