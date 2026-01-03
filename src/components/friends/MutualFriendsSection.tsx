import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MutualFriend } from "../../hooks/friends/useFriendProfile";

interface MutualFriendsSectionProps {
    friends: MutualFriend[];
    count: number;
}

export function MutualFriendsSection({ friends, count }: MutualFriendsSectionProps) {
    if (count === 0) return null;

    return (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {count} Mutual Friend{count !== 1 ? 's' : ''}
            </h3>
            <div className="flex items-center gap-2">
                <div className="flex -space-x-3">
                    {friends.map((friend) => (
                        <Avatar key={friend.id} className="w-8 h-8 border-2 border-white">
                            <AvatarImage src={friend.avatar_url} alt={friend.full_name} />
                            <AvatarFallback>{friend.full_name.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
                {count > friends.length && (
                    <span className="text-xs text-gray-500 ml-2">
                        +{count - friends.length} more
                    </span>
                )}
            </div>
        </div>
    );
}
