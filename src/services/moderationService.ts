import { supabase } from '@/lib/supabase';
import { notifyMerchantNewReview } from './favoriteNotificationService';

export interface PendingReview {
    id: string;
    business_id: string;
    user_id: string;
    recommendation: boolean;
    text: string | null;
    tags: Array<{ id: string; label: string; icon: string }>;
    photo_urls: string[];
    created_at: string;
    moderation_status: 'pending';
    user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
    business: {
        id: string;
        name: string;
    };
}

export interface ModerationAction {
    reviewId: string;
    action: 'approve' | 'reject';
    reason?: string;
}

/**
 * Get all pending reviews for admin moderation
 */
export async function getPendingReviews(): Promise<PendingReview[]> {
    // Fetch reviews
    const { data: reviews, error } = await supabase
        .from('business_reviews')
        .select(`
            *,
            business:businesses!business_id (id, name)
        `)
        .eq('moderation_status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }); // Oldest first (FIFO)

    if (error) {
        console.error('[ModerationService] Error fetching pending reviews:', error);
        throw new Error('Could not load pending reviews');
    }

    if (!reviews || reviews.length === 0) return [];

    // Manually fetch user profiles because the foreign key relationship 
    // between business_reviews and profiles might not be detected by PostgREST
    const userIds = [...new Set(reviews.map(r => r.user_id))];

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

    if (profilesError) {
        console.error('[ModerationService] Error fetching profiles:', profilesError);
    }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Combine data
    const reviewsWithProfiles = reviews.map(review => ({
        ...review,
        user: profilesMap.get(review.user_id) || {
            id: review.user_id,
            full_name: 'Unknown User',
            avatar_url: null
        }
    }));

    return reviewsWithProfiles as unknown as PendingReview[];
}

/**
 * Get count of pending reviews
 */
export async function getPendingReviewCount(): Promise<number> {
    const { count, error } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending')
        .is('deleted_at', null);

    if (error) {
        console.error('[ModerationService] Error fetching pending count:', error);
        return 0;
    }

    return count || 0;
}

// ... (existing imports)

/**
 * Approve a review
 */
export async function approveReview(reviewId: string): Promise<void> {
    console.log('[ModerationService] Approving review:', reviewId);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('[ModerationService] Error fetching profile:', profileError);
        throw new Error('Could not verify admin role');
    }

    console.log('[ModerationService] User role:', profile?.role);

    if (profile?.role !== 'admin') {
        throw new Error('Only admins can approve reviews');
    }

    // Update review status
    const { data: updateData, error: updateError } = await supabase
        .from('business_reviews')
        .update({
            moderation_status: 'approved',
            moderated_by: user.id,
            moderated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select();

    console.log('[ModerationService] Update result:', { updateData, updateError });

    if (updateError) {
        console.error('[ModerationService] Update error:', updateError);
        throw new Error(`Could not approve review: ${updateError.message}`);
    }

    if (!updateData || updateData.length === 0) {
        console.error('[ModerationService] No rows updated - review may not exist or RLS blocking');
        throw new Error('Could not approve review - no rows updated');
    }

    console.log('[ModerationService] Review approved successfully');

    // Log action
    await supabase.from('review_moderation_log').insert({
        review_id: reviewId,
        action: 'approve',
        performed_by: user.id
    });

    // Send notification to reviewer
    await notifyReviewer(reviewId, 'approved');

    // NEW: Notify Merchant that review is live
    try {
        // Fetch review details including reviewer name and business id
        // We need: business_id, reviewerName, recommendation
        const { data: reviewDetails, error: detailsError } = await supabase
            .from('business_reviews')
            .select(`
                business_id, 
                recommendation, 
                user_id,
                user:profiles!user_id (full_name),
                business:businesses!business_id (name, logo_url)
            `)
            .eq('id', reviewId)
            .single();

        if (detailsError || !reviewDetails) {
            console.error('[ModerationService] Error fetching details for merchant notification:', detailsError);
        } else {
            const reviewerName = Array.isArray(reviewDetails.user)
                ? (reviewDetails.user[0] as any)?.full_name
                : (reviewDetails.user as any)?.full_name || 'A customer';

            await notifyMerchantNewReview(
                reviewDetails.business_id,
                reviewId,
                reviewDetails.user_id,
                reviewerName,
                reviewDetails.recommendation
            );
            console.log('✅ [ModerationService] Merchant notified of new approved review');
        }
    } catch (notifWarn) {
        console.warn('[ModerationService] Failed to notify merchant (non-blocking):', notifWarn);
    }
}

/**
 * Reject a review
 */
export async function rejectReview(reviewId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Only admins can reject reviews');
    }

    if (!reason || !reason.trim()) {
        throw new Error('Rejection reason is required');
    }

    // Update review status
    const { error: updateError } = await supabase
        .from('business_reviews')
        .update({
            moderation_status: 'rejected',
            moderated_by: user.id,
            moderated_at: new Date().toISOString(),
            rejection_reason: reason.trim()
        })
        .eq('id', reviewId);

    if (updateError) throw new Error('Could not reject review');

    // Log action
    await supabase.from('review_moderation_log').insert({
        review_id: reviewId,
        action: 'reject',
        performed_by: user.id,
        reason: reason.trim()
    });

    // Send notification to reviewer
    await notifyReviewer(reviewId, 'rejected', reason);
}

/**
 * Notify reviewer of moderation decision
 * US-11.4.1.4: Reviewer Notification on Moderation
 */
async function notifyReviewer(
    reviewId: string,
    status: 'approved' | 'rejected',
    reason?: string
) {
    console.log('🔔 [notifyReviewer] Starting notification for:', { reviewId, status, reason });

    // Get review and user info
    const { data: review, error: reviewError } = await supabase
        .from('business_reviews')
        .select('user_id, business:businesses!business_id(id, name, owner_id, logo_url)')
        .eq('id', reviewId)
        .single();

    if (reviewError || !review) {
        console.error('❌ [notifyReviewer] Could not fetch review:', reviewError);
        return;
    }

    const businessName = Array.isArray(review.business)
        ? review.business[0]?.name
        : (review.business as any)?.name;
    const businessId = Array.isArray(review.business)
        ? review.business[0]?.id
        : (review.business as any)?.id;
    const businessOwnerId = Array.isArray(review.business)
        ? review.business[0]?.owner_id
        : (review.business as any)?.owner_id;

    const title = status === 'approved'
        ? '🎉 Review Published!'
        : '❌ Review Not Approved';

    const message = status === 'approved'
        ? `Your review for "${businessName}" has been published and is now visible to everyone!`
        : `Your review for "${businessName}" was not approved. Reason: ${reason || 'Did not meet our guidelines.'}`;

    const actionUrl = businessId ? `/business/${businessId}` : '/reviews';

    try {
        // 1. Create in-app notification using notification_log table
        console.log('🔔 [notifyReviewer] Creating in-app notification...');
        const { data: notifData, error: notifError } = await supabase
            .from('notification_log')
            .insert([{
                user_id: review.user_id,
                notification_type: 'review_moderation',
                title: title,
                body: message,
                data: {
                    reviewId,
                    status,
                    businessId,
                    businessName,
                    sender_id: businessOwnerId, // Important: sender_id allows the view to join with profiles
                    type: 'review_moderation',
                    url: actionUrl,
                    businessAvatar: Array.isArray(review.business) ? review.business[0]?.logo_url : (review.business as any)?.logo_url,
                    ...(reason ? { rejection_reason: reason } : {})
                },
                opened: false,
            }]);
        // .select() // Removed to avoid RLS violation (users can insert but not see other's logs)
        // .single();

        if (notifError) {
            console.error('❌ [notifyReviewer] Failed to create in-app notification:', notifError);
        } else {
            console.log('✅ [notifyReviewer] In-app notification created (no ID returned)');
        }

        // 2. Check user preferences for push notifications
        const { data: profile, error: prefError } = await supabase
            .from('profiles')
            .select('notification_preferences')
            .eq('id', review.user_id)
            .single();

        if (prefError) {
            console.error('❌ [notifyReviewer] Error fetching preferences:', prefError);
        }

        const prefs = profile?.notification_preferences as any;
        const pushEnabled = prefs?.push_enabled !== false;

        console.log(`🔔 [notifyReviewer] Push enabled: ${pushEnabled}`);

        if (pushEnabled) {
            // 3. Send push notification via Edge Function
            console.log('🚀 [notifyReviewer] Sending push notification...');
            const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
                body: {
                    user_id: review.user_id,
                    title: title,
                    body: message,
                    data: {
                        type: 'review_moderation',
                        review_id: reviewId,
                        business_id: businessId,
                        status: status,
                        url: actionUrl
                    }
                }
            });

            if (pushError) {
                console.error('❌ [notifyReviewer] Push notification failed:', pushError);
            } else {
                console.log('✅ [notifyReviewer] Push notification sent:', pushData);
            }
        }

        console.log(`✅ [notifyReviewer] Notification complete for user ${review.user_id}`);
    } catch (error) {
        console.error('❌ [notifyReviewer] Unexpected error:', error);
    }
}

/**
 * Notify all admins about new pending reviews
 * US-11.4.1.5: Admin Queue Notifications
 */
export async function notifyAdminsNewReview(
    reviewId: string,
    reviewerName: string,
    businessName: string,
    senderId: string // The reviewer's user ID
): Promise<void> {
    console.log('🔔 [notifyAdminsNewReview] Starting admin notifications for new review:', reviewId);

    try {
        // Get all admin users
        const { data: admins, error: adminError } = await supabase
            .from('profiles')
            .select('id, notification_preferences')
            .eq('role', 'admin');

        if (adminError || !admins || admins.length === 0) {
            console.log('⚠️ [notifyAdminsNewReview] No admins found or error:', adminError);
            return;
        }

        console.log(`🔔 [notifyAdminsNewReview] Found ${admins.length} admin(s)`);

        // Create notification for each admin
        for (const admin of admins) {
            const title = '📝 New Review Pending';
            const message = `${reviewerName} submitted a review for "${businessName}" that needs approval.`;

            // Create in-app notification
            const { error: notifError } = await supabase
                .from('notification_log')
                .insert([{
                    user_id: admin.id,
                    notification_type: 'admin_review_pending',
                    title: title,
                    body: message,
                    data: {
                        reviewId,
                        reviewerName,
                        businessName,
                        sender_id: senderId,
                        type: 'admin_review_pending',
                        url: '/admin/moderation'
                    },
                    opened: false,
                }]);

            if (notifError) {
                console.error(`❌ [notifyAdminsNewReview] Failed for admin ${admin.id}:`, notifError);
            } else {
                console.log(`✅ [notifyAdminsNewReview] Notified admin ${admin.id}`);
            }

            // Check if admin has push enabled
            const prefs = admin.notification_preferences as any;
            const pushEnabled = prefs?.push_enabled !== false;

            if (pushEnabled) {
                // Send push notification
                const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
                    body: {
                        user_id: admin.id,
                        title: title,
                        body: message,
                        data: {
                            type: 'admin_review_pending',
                            review_id: reviewId,
                            url: '/admin/moderation'
                        }
                    }
                });

                if (pushError) {
                    console.error(`❌ [notifyAdminsNewReview] Push failed for admin ${admin.id}:`, pushError);
                }
            }
        }

        console.log('✅ [notifyAdminsNewReview] All admin notifications sent');
    } catch (error) {
        console.error('❌ [notifyAdminsNewReview] Unexpected error:', error);
    }
}

