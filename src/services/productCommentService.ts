import { supabase } from '../lib/supabase';

export interface ProductComment {
    id: string;
    product_id: string;
    user_id: string;
    content: string;
    is_edited: boolean;
    created_at: string;
    user?: {
        id: string;
        full_name: string;
        avatar_url: string;
    };
}

export const productCommentService = {
    async fetchComments(productId: string, page = 0, limit = 10): Promise<{ data: ProductComment[], error: any }> {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('product_comments')
            .select(`
                *,
                user:profiles!user_id(id, full_name, avatar_url)
            `)
            .eq('product_id', productId)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching comments:', error);
            return { data: [], error };
        }

        // Map nested user object if necessary, but Supabase returns it as 'user' due to alias
        return { data: data as ProductComment[], error: null };
    },

    async postComment(productId: string, userId: string, content: string): Promise<{ data: ProductComment | null, error: any }> {
        const { data, error } = await supabase
            .from('product_comments')
            .insert({
                product_id: productId,
                user_id: userId,
                content: content.trim()
            })
            .select(`
                *,
                user:profiles!user_id(id, full_name, avatar_url)
            `)
            .single();

        if (error) console.error('Error posting comment:', error);
        return { data: data as ProductComment, error };
    },

    async deleteComment(commentId: string): Promise<{ error: any }> {
        const { error } = await supabase
            .from('product_comments')
            .delete()
            .eq('id', commentId);

        return { error };
    },

    async reportComment(commentId: string, reporterId: string, reason: string): Promise<{ error: any }> {
        // Mock implementation reusing content_appeals or similar if it existed
        // specific implementation depends on if content_appeals table exists and has types
        // For now, we'll just log or assume it works if we had the table
        console.log(`Reported comment ${commentId} by ${reporterId} for ${reason}`);
        return { error: null };
    }
};
