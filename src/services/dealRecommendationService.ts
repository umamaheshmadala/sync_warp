import { supabase } from '@/lib/supabase';

export interface FriendLikedDeal {
    id: string;
    title: string;
    description: string;
    price: number;
    original_price: number;
    image_url: string;
    store_name: string;
    expires_at: string;
    likes_by_friends: number;
    friend_avatars: string[];
    friend_names: string[];
}

export async function getDealsLikedByFriends(
    limit: number = 20
): Promise<FriendLikedDeal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('get_deals_liked_by_friends', {
        current_user_id: user.id,
        limit_count: limit,
    });

    if (error) {
        console.error('Error fetching friend liked deals:', error);
        throw error;
    }

    return data || [];
}
