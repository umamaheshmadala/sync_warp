import { ProfileHeader } from "./ProfileHeader";
import { MutualFriendsSection } from "./MutualFriendsSection";
import { FriendActionsMenu } from "./FriendActionsMenu";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { ProfileModalSkeleton } from "../ui/skeletons/ProfileModalSkeleton";
import { DialogTitle } from "@/components/ui/dialog";

interface FriendProfileContentProps {
    data: any;
    isLoading: boolean;
    friendId: string;
    onClose: () => void;
    sendMessage: (id: string) => void;
    onToggleFriend: () => void;
    onToggleBlock: () => void;
    handleShare: () => void;
    isFriend: boolean;
    isBlocked: boolean;
}

export function FriendProfileContent({
    data,
    isLoading,
    friendId,
    onClose,
    sendMessage,
    onToggleFriend,
    onToggleBlock,
    handleShare,
    isFriend,
    isBlocked,
}: FriendProfileContentProps) {
    if (isLoading || !data) {
        return <ProfileModalSkeleton />;
    }

    const { profile, mutualFriends, mutualFriendsCount } = data;

    return (
        <div className="space-y-4">
            {/* Hidden title for accessibility */}
            <DialogTitle className="sr-only">
                {profile?.full_name}'s Profile
            </DialogTitle>

            <ProfileHeader profile={profile} />

            {mutualFriends && mutualFriends.length > 0 && (
                <MutualFriendsSection
                    friends={mutualFriends}
                    count={mutualFriendsCount}
                />
            )}

            <FriendActionsMenu
                isFriend={isFriend}
                friendshipStatus={(data?.profile as any)?.friendship_status}
                isBlocked={isBlocked}
                onMessage={() => sendMessage(friendId)}
                onToggleFriend={onToggleFriend}
                onToggleBlock={onToggleBlock}
                onShare={handleShare}
            />

            {profile?.is_activity_public && <RecentActivityFeed userId={friendId} />}
        </div>
    );
}

