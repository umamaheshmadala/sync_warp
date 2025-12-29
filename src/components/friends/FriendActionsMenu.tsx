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
    onToggleFriend: () => void;
    onToggleBlock: () => void;
    onShare: () => void;
    isFriend: boolean;
    isBlocked: boolean;
}

export function FriendActionsMenu({
    onMessage,
    onToggleFriend,
    onToggleBlock,
    onShare,
    isFriend,
    isBlocked,
}: FriendActionsMenuProps) {
    return (
        <div className="flex items-center justify-center gap-3 mt-6">
            <Button onClick={onMessage} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
            </Button>

            <Button
                variant="outline"
                onClick={onToggleFriend}
                className={`flex-1 border-gray-300 text-gray-900 hover:bg-gray-100 ${isFriend ? "bg-gray-100" : "bg-white"}`}
            >
                {isFriend ? (
                    <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfriend
                    </>
                ) : (
                    <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friend
                    </>
                )}
            </Button>

            <Button
                variant="outline"
                size="icon"
                onClick={onShare}
                title="Share Profile"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-white"
            >
                <Share2 className="w-4 h-4" />
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-700 hover:bg-gray-100">
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onToggleBlock} className="text-red-600 focus:text-red-600">
                        {isBlocked ? (
                            <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Unblock User
                            </>
                        ) : (
                            <>
                                <Ban className="w-4 h-4 mr-2" />
                                Block User
                            </>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
