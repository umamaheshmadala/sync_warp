import { Button } from "@/components/ui/button";
import { MessageCircle, UserMinus, Ban, UserPlus, UserCheck, Share2, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FriendActionsMenuProps {
    onMessage: () => void;
    onUnfriend: () => void;
    onBlock: () => void;
    onToggleFollow: () => void;
    onShare: () => void;
    isFollowing: boolean;
}

export function FriendActionsMenu({
    onMessage,
    onUnfriend,
    onBlock,
    onToggleFollow,
    onShare,
    isFollowing,
}: FriendActionsMenuProps) {
    return (
        <div className="flex items-center justify-center gap-3 mt-6">
            <Button onClick={onMessage} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
            </Button>

            <Button
                variant="outline"
                onClick={onToggleFollow}
                className={isFollowing ? "bg-gray-100" : ""}
            >
                {isFollowing ? (
                    <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Following
                    </>
                ) : (
                    <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Follow
                    </>
                )}
            </Button>

            <Button variant="outline" size="icon" onClick={onShare} title="Share Profile">
                <Share2 className="w-4 h-4" />
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onUnfriend} className="text-red-600 focus:text-red-600">
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfriend
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onBlock} className="text-red-600 focus:text-red-600">
                        <Ban className="w-4 h-4 mr-2" />
                        Block User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
