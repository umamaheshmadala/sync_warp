import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useFriendProfile } from "../../hooks/friends/useFriendProfile";
import { useFriendActions } from "../../hooks/friends/useFriendActions";
import { FriendProfileContent } from "./FriendProfileContent";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "react-hot-toast";
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
    const { unfriend, blockUser, toggleFollow, sendMessage } = useFriendActions();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
    const [showBlockDialog, setShowBlockDialog] = useState(false);

    if (!friendId) return null;

    const handleUnfriend = () => {
        unfriend.mutate(friendId);
        setShowUnfriendDialog(false);
        onClose();
    };

    const handleBlock = () => {
        blockUser.mutate({ userId: friendId });
        setShowBlockDialog(false);
        onClose();
    };

    const handleShare = async () => {
        if (!data?.profile) return;

        const shareData = {
            title: `Check out ${data.profile.full_name}'s profile on SynC`,
            text: `Connect with ${data.profile.full_name} on SynC!`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                toast.success("Profile link copied to clipboard");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };

    const contentProps = {
        data,
        isLoading,
        friendId,
        onClose,
        sendMessage,
        toggleFollow,
        setShowUnfriendDialog,
        setShowBlockDialog,
        handleShare,
    };

    return (
        <>
            {isDesktop ? (
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="max-w-md sm:max-w-lg p-6 rounded-2xl bg-white dark:bg-gray-900" aria-describedby="friend-profile-description">
                        <span id="friend-profile-description" className="sr-only">Friend profile information and actions</span>
                        <FriendProfileContent {...contentProps} />
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isOpen} onOpenChange={onClose}>
                    <DrawerContent className="p-6 pt-0 max-h-[90vh] bg-white dark:bg-gray-900" aria-describedby="friend-profile-description-drawer">
                        <span id="friend-profile-description-drawer" className="sr-only">Friend profile information and actions</span>
                        <FriendProfileContent {...contentProps} />
                    </DrawerContent>
                </Drawer>
            )}

            {/* Unfriend Confirmation */}
            <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
                <AlertDialogContent>
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

            {/* Block Confirmation */}
            <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block {data?.profile.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They won't be able to find your profile, posts, or message you. They won't be notified that you blocked them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlock} className="bg-red-600 hover:bg-red-700 text-white">
                            Block
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
