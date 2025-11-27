import { useQuery } from '@tanstack/react-query';
import { Heart, ExternalLink } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { getDealsLikedByFriends } from '../../services/dealRecommendationService';

export function FriendLikedDealsSection() {
    const { data: deals, isLoading } = useQuery({
        queryKey: ['friend-liked-deals'],
        queryFn: () => getDealsLikedByFriends(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Deals Your Friends Liked</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!deals || deals.length === 0) {
        return null; // Hide section if no recommendations
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Deals Your Friends Liked</h2>
                <span className="text-sm text-gray-600">
                    {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deals.map((deal) => (
                    <div key={deal.id} className="relative group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
                        {/* Deal Image */}
                        <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            {deal.image_url ? (
                                <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
                            ) : (
                                <Heart className="w-16 h-16 text-indigo-300" />
                            )}
                        </div>

                        {/* Friend Avatars Overlay */}
                        <div
                            className="absolute top-2 right-2 z-10"
                            title={`Liked by ${deal.friend_names?.slice(0, 3).join(', ')}${deal.likes_by_friends > 3 ? ` and ${deal.likes_by_friends - 3} more` : ''}`}
                        >
                            <div className="flex -space-x-2 bg-black/20 backdrop-blur-sm p-1 rounded-full transition-all group-hover:bg-black/40">
                                {deal.friend_avatars?.slice(0, 3).map((avatar, index) => (
                                    <Avatar
                                        key={index}
                                        className="h-8 w-8 border-2 border-white ring-1 ring-black/10"
                                    >
                                        <AvatarImage src={avatar} />
                                        <AvatarFallback className="bg-indigo-600 text-white text-xs">
                                            {deal.friend_names[index]?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {deal.likes_by_friends > 3 && (
                                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white ring-1 ring-black/10">
                                        +{deal.likes_by_friends - 3}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Deal Content */}
                        <div className="p-4">
                            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">{deal.title}</h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deal.description}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                    <span>{deal.likes_by_friends} {deal.likes_by_friends === 1 ? 'friend' : 'friends'}</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
