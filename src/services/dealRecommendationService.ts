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
    if (!user) {
        console.warn('User not authenticated, returning empty deals');
        return [];
    }

    // Note: The RPC function doesn't accept parameters - it uses auth.uid() internally
    const { data, error } = await supabase.rpc('get_deals_liked_by_friends');

    if (error) {
        console.error('Error fetching friend liked deals:', error);
        return []; // Return empty array instead of throwing to prevent component from disappearing
    }

    return data || [];
}
