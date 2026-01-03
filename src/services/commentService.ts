import { supabase } from '../lib/supabase';

export interface Comment {
    id: string;
    deal_id: string;
    user_id: string;
    content: string;
    mentioned_user_ids: string[];
    created_at: string;
    updated_at: string;
    profile?: {
        full_name: string;
        avatar_url: string;
        username: string;
    };
}

/**
 * Create a new comment on a deal
 */
export async function createComment(dealId: string, text: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Extract mentioned user IDs
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const matches = [...text.matchAll(mentionRegex)];
    const mentionedUserIds = matches.map((match) => match[2]);

    // Remove duplicates
    const uniqueMentionedIds = [...new Set(mentionedUserIds)];

    const { data, error } = await supabase
        .from('deal_comments')
        .insert({
            deal_id: dealId,
            user_id: user.id,
            content: text,
            mentioned_user_ids: uniqueMentionedIds,
        })
        .select(`
      *,
      profile:profiles(full_name, avatar_url, username)
    `)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get comments for a deal
 */
export async function getDealComments(dealId: string): Promise<Comment[]> {
    const { data, error } = await supabase
        .from('deal_comments')
        .select(`
      *,
      profile:profiles(full_name, avatar_url, username)
    `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Notify mentioned users (fallback/client-side if needed)
 * Note: Primary notification logic is in database trigger
 */
export async function notifyMentionedUsers(
    userIds: string[],
    dealId: string,
    commentId: string
) {
    // Notifications are handled by database trigger
    // This function is kept for potential future enhancements or client-side fallbacks
    return { success: true };
}
