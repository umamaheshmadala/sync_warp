import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { messagingService } from "../../services/messagingService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useFriendProfile } from "../../hooks/friends/useFriendProfile";
import { useFriendActions } from "../../hooks/friends/useFriendActions";
import { FriendProfileContent } from "./FriendProfileContent";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "react-hot-toast";
import { useIsBlocked, useBlockUser, useUnblockUser } from "../../hooks/useBlock";
import { useAuthStore } from "../../store/authStore";
import { friendsService } from "../../services/friendsService";
import { ShareModal } from "../Sharing/ShareModal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FriendProfileModalProps {
    friendId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function FriendProfileModal({ friendId, isOpen, onClose }: FriendProfileModalProps) {
    const { data, isLoading } = useFriendProfile(friendId || "");
    const { unfriend, sendRequest } = useFriendActions();
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    // Block status query
    const { data: isBlocked = false } = useIsBlocked(friendId || "");
    const blockUserMutation = useBlockUser();
    const unblockUserMutation = useUnblockUser();

    // Use status from profile data
    const friendshipStatus = data?.profile?.friendship_status || 'none';
    const isFriend = friendshipStatus === 'active';

    const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    if (!friendId) return null;

    const handleSendMessage = async (id: string) => {
        try {
            const conversationId = await messagingService.createOrGetConversation(id);
            // Invalidate to ensure sidebar updates
            await queryClient.invalidateQueries({ queryKey: ['conversations'] });
            await queryClient.removeQueries({ queryKey: ['messages', conversationId] });

            navigate(`/messages/${conversationId}`);
            onClose();
        } catch (error) {
            console.error('Failed to start conversation:', error);
            navigate('/messages');
            onClose();
        }
    };

    const handleToggleFriend = () => {
        if (isFriend) {
            setShowUnfriendDialog(true);
        } else if (friendshipStatus === 'none') {
            setShowAddFriendDialog(true);
        } else if (friendshipStatus === 'pending_received') {
            // For now, maybe just redirect to friends page or show toast
            toast.error('This user has already sent you a request. Check your friend requests.');
        } else if (friendshipStatus === 'pending_sent') {
            toast.error('Friend request already sent.');
        }
    };

    const handleUnfriend = () => {
        unfriend.mutate(friendId);
        setShowUnfriendDialog(false);
    };

    const handleAddFriend = () => {
        sendRequest.mutate(friendId, {
            onSuccess: () => {
                toast.success('Friend request sent!');
                setShowAddFriendDialog(false);
            },
            onError: () => {
                toast.error('Failed to send friend request');
                setShowAddFriendDialog(false);
            }
        });
    };

    const handleToggleBlock = () => {
        setShowBlockDialog(true);
    };

    const handleBlock = () => {
        if (isBlocked) {
            unblockUserMutation.mutate(friendId);
        } else {
            blockUserMutation.mutate({ userId: friendId });
        }
        setShowBlockDialog(false);
        onClose();
    };

    const handleShare = () => {
        setShowShareModal(true);
    };

    const contentProps = {
        data,
        isLoading,
        friendId,
        onClose,
        sendMessage: handleSendMessage,
        onToggleFriend: handleToggleFriend,
        onToggleBlock: handleToggleBlock,
        handleShare,
        isFriend,
        friendshipStatus,
        isBlocked,
    };

    return (
        <>
            {isDesktop ? (
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="fixed left-0 right-0 mx-auto translate-x-0 max-w-sm p-4 rounded-2xl bg-white shadow-xl border border-gray-100" aria-describedby="friend-profile-description">
                        <span id="friend-profile-description" className="sr-only">Friend profile information and actions</span>
                        <FriendProfileContent {...contentProps} />
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isOpen} onOpenChange={onClose}>
                    <DrawerContent className="p-6 pt-0 max-h-[90vh] bg-white rounded-t-xl" aria-describedby="friend-profile-description-drawer">
                        <span id="friend-profile-description-drawer" className="sr-only">Friend profile information and actions</span>
                        <FriendProfileContent {...contentProps} />
                    </DrawerContent>
                </Drawer>
            )}

            {/* Unfriend Confirmation */}
            <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unfriend {data?.profile.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user from your friends list? You won't be able to message them directly until you're friends again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnfriend} className="bg-red-600 hover:bg-red-700 text-white">
                            Unfriend
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Friend Confirmation */}
            <AlertDialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add {data?.profile.full_name} as friend?</AlertDialogTitle>
                        <AlertDialogDescription>
                            A friend request will be sent to this user. They will need to accept it to become friends.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAddFriend} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Send Request
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Block/Unblock Confirmation */}
            <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isBlocked ? 'Unblock' : 'Block'} {data?.profile.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isBlocked
                                ? "This user will be able to find your profile, posts, and message you again."
                                : "They won't be able to find your profile, posts, or message you. They won't be notified that you blocked them."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBlock}
                            className={isBlocked
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }
                        >
                            {isBlocked ? 'Unblock' : 'Block'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Share Profile Modal - Story 10.1.5 */}
            {data?.profile && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    entityType="profile"
                    entityId={friendId}
                    title={data.profile.full_name || 'SynC User'}
                    description={`${data.profile.full_name} is on SynC - Connect with them!`}
                    imageUrl={data.profile.avatar_url}
                    url={`/profile/${friendId}`}
                    isPrivate={false}
                />
            )}
        </>
    );
}

