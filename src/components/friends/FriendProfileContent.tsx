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
    toggleFollow: (params: { friendId: string; isFollowing: boolean }) => void;
    setShowUnfriendDialog: (show: boolean) => void;
    setShowBlockDialog: (show: boolean) => void;
    handleShare: () => void;
}

export function FriendProfileContent({
    data,
    isLoading,
    friendId,
    onClose,
    sendMessage,
    toggleFollow,
    setShowUnfriendDialog,
    setShowBlockDialog,
    handleShare,
}: FriendProfileContentProps) {
    if (isLoading || !data) {
        return <ProfileModalSkeleton />;
    }

    const { profile, mutualFriends, mutualFriendsCount } = data;

    return (
        <div className="space-y-6">
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
                isFollowing={profile?.is_following || false}
                onMessage={() => sendMessage(friendId)}
                onUnfriend={() => setShowUnfriendDialog(true)}
                onBlock={() => setShowBlockDialog(true)}
                onToggleFollow={() =>
                    toggleFollow({
                        friendId,
                        isFollowing: profile?.is_following || false,
                    })
                }
                onShare={handleShare}
            />

            {profile?.is_activity_public && <RecentActivityFeed />}
        </div>
    );
}
