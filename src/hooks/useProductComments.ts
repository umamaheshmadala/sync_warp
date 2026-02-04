import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { productCommentService, ProductComment } from '../services/productCommentService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export const useProductComments = (productId: string, initialCount: number = 0) => {
    const { user } = useAuthStore();
    const [comments, setComments] = useState<ProductComment[]>([]);
    const [commentCount, setCommentCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const fetchComments = useCallback(async (reset = false) => {
        if (!productId) return;

        try {
            setLoading(true);
            const currentPage = reset ? 0 : page;
            const { data, error } = await productCommentService.fetchComments(productId, currentPage);

            if (error) throw error;

            if (data.length < 10) {
                setHasMore(false);
            }

            if (reset) {
                setComments(data);
                setPage(1); // Set next page
            } else {
                setComments(prev => [...prev, ...data]);
                setPage(prev => prev + 1);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [productId, page]);

    const postComment = async (content: string) => {
        if (!user) {
            toast.error('Please login to comment');
            return;
        }

        // Optimistic Update
        const tempId = Math.random().toString();
        const optimisticComment: ProductComment = {
            id: tempId,
            product_id: productId,
            user_id: user.id,
            content: content,
            is_edited: false,
            created_at: new Date().toISOString(),
            user: {
                id: user.id,
                full_name: user.user_metadata?.full_name || 'Me',
                avatar_url: user.user_metadata?.avatar_url || ''
            }
        };

        setComments(prev => [optimisticComment, ...prev]);
        setCommentCount(prev => prev + 1);

        const { data, error } = await productCommentService.postComment(productId, user.id, content);

        if (error) {
            // Revert
            setComments(prev => prev.filter(c => c.id !== tempId));
            setCommentCount(prev => prev - 1);
            toast.error('Failed to post comment');
        } else if (data) {
            // Replace temp with real
            setComments(prev => prev.map(c => c.id === tempId ? data : c));
        }
    };

    const deleteComment = async (commentId: string) => {
        // Optimistic delete
        const prevComments = [...comments];
        setComments(prev => prev.filter(c => c.id !== commentId));
        setCommentCount(prev => Math.max(0, prev - 1));

        const { error } = await productCommentService.deleteComment(commentId);

        if (error) {
            // Revert
            setComments(prevComments);
            setCommentCount(prev => prev + 1);
            toast.error(`Failed to delete comment: ${error.message || 'Unknown error'}`);
        } else {
            toast.success('Comment deleted');
        }
    };

    // Initial Load
    useEffect(() => {
        fetchComments(true);
    }, [productId]);

    // Real-time Subscription (for NEW comments from OTHERS)
    useEffect(() => {
        if (!productId) return;

        console.log('UseProductComments: Subscribing to', productId);

        const channel = supabase
            .channel(`comments-${productId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'product_comments',
                    filter: `product_id=eq.${productId}`
                },
                async (payload) => {
                    console.log('Realtime Comment received:', payload);

                    // Ignore our own comments (handled optimistically)
                    if (user && payload.new.user_id === user.id) {
                        console.log('Ignoring own comment');
                        return;
                    }

                    // Fetch the single new comment with user data
                    const { data, error } = await supabase
                        .from('product_comments')
                        .select(`*, user:profiles!user_id(id, full_name, avatar_url)`)
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        console.log('Fetched new comment details:', data);
                        setComments(prev => {
                            // Deduplicate just in case
                            if (prev.some(c => c.id === data.id)) return prev;
                            return [data as ProductComment, ...prev];
                        });
                        setCommentCount(prev => prev + 1);
                    } else {
                        console.error('Error fetching new comment details:', error);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'product_comments',
                    filter: `product_id=eq.${productId}`
                },
                (payload) => {
                    // Handle real-time delete
                    const deletedId = payload.old.id;
                    setComments(prev => prev.filter(c => c.id !== deletedId));
                    setCommentCount(prev => Math.max(0, prev - 1));
                }
            )
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [productId, user?.id]);

    return {
        comments,
        commentCount,
        loading,
        hasMore,
        loadMore: () => fetchComments(false),
        postComment,
        deleteComment
    };
};
