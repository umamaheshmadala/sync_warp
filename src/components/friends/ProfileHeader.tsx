import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";
import { FriendProfile } from "../../hooks/friends/useFriendProfile";

interface ProfileHeaderProps {
    profile: FriendProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
    return (
        <div className="flex items-start text-left gap-5">
            <div className="relative shrink-0">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback>{profile.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {/* Status dot moved to ensure visibility */}
                {profile.is_online && (
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full" title="Online" />
                )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-2xl font-bold truncate text-gray-900">{profile.full_name}</h2>
                <p className="text-gray-500">@{profile.username}</p>
                <p className="text-xs text-gray-400 mt-0.5">ID: ...{profile.id.split('-').pop()}</p>

                {profile.location && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                    </div>
                )}

                {profile.bio && (
                    <p className="mt-3 text-sm text-gray-700 leading-relaxed line-clamp-3">{profile.bio}</p>
                )}
            </div>
        </div>
    );
}
