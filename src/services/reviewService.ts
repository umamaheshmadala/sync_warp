// =====================================================
// Story 5.2: Binary Review System - Service Layer
// =====================================================

import { supabase } from '../lib/supabase';
import type {
  Review as BusinessReview,
  BusinessReviewWithDetails,
  BusinessReviewResponse,
  ReviewStats,
  UserReviewActivity,
  CreateReviewInput,
  UpdateReviewInput,
  CreateResponseInput,
  UpdateResponseInput,
  ReviewFilters,
} from '../types/review';
import {
  REVIEW_TEXT_WORD_LIMIT,
  RESPONSE_TEXT_WORD_LIMIT,
  REVIEW_TEXT_MIN_WORDS
} from '../types/review';
import { notifyMerchantNewReview, notifyUserReviewResponse } from './favoriteNotificationService';

/**
 * Utility function to count words in text
 */
export function countWords(text: string | null | undefined): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Utility function to validate word count
 */
export function validateReviewText(text: string | null | undefined): { valid: boolean; error?: string } {
  if (!text || !text.trim()) {
    // Text is optional
    return { valid: true };
  }

  const wordCount = countWords(text);

  if (wordCount < REVIEW_TEXT_MIN_WORDS) {
    return {
      valid: false,
      error: `Review text must be at least ${REVIEW_TEXT_MIN_WORDS} word${REVIEW_TEXT_MIN_WORDS > 1 ? 's' : ''}`
    };
  }

  if (wordCount > REVIEW_TEXT_WORD_LIMIT) {
    return {
      valid: false,
      error: `Review text must be ${REVIEW_TEXT_WORD_LIMIT} words or less`
    };
  }

  return { valid: true };
}

export function validateWordCount(text: string, limit: number): boolean {
  const wordCount = countWords(text);
  return wordCount <= limit;
}

/**
 * Check if a review can be edited
 * Story 11.1.3: Reviews are now ALWAYS editable by their author
 */
export function canEditReview(_createdAt: string): boolean {
  // Removed 24-hour restriction - reviews are always editable
  return true;
}

// =====================================================
// REVIEW CRUD OPERATIONS
// =====================================================

/**
 * Create a new review
 * Requires: GPS check-in verification
 */
export async function createReview(input: CreateReviewInput): Promise<BusinessReview> {
  console.log('📝 Creating review:', input);

  // Validate word count if text is provided
  const textValidation = validateReviewText(input.review_text);
  if (!textValidation.valid) {
    throw new Error(textValidation.error);
  }

  // GPS check-in verification - ensures user has physically visited business
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if GPS check-in is required (global system setting)
  const { fetchGpsCheckinRequirement } = await import('./adminSettingsService');
  const requireCheckin = await fetchGpsCheckinRequirement();

  if (requireCheckin) {
    // Verify GPS check-in before allowing review
    if (input.checkin_id) {
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('verify_checkin_for_review', {
          p_user_id: user.id,
          p_business_id: input.business_id,
          p_checkin_id: input.checkin_id,
        });

      if (verifyError) {
        console.error('❌ Check-in verification error:', verifyError);
        throw new Error('Failed to verify check-in. Please try again.');
      }

      if (!verifyData) {
        throw new Error('Invalid check-in. You must check in at this business before leaving a review.');
      }

      console.log('✅ Check-in verified for review');
    } else {
      throw new Error('You must check in at this business before leaving a review');
    }
  } else {
    console.log('⚠️ GPS check-in requirement disabled by admin (Testing Mode)');
  }

  // Create the review
  const { data, error } = await supabase
    .from('business_reviews')
    .insert({
      business_id: input.business_id,
      user_id: user.id,
      recommendation: input.recommendation,
      review_text: input.review_text || null,
      photo_urls: input.photo_urls || [],
      tags: input.tags || [],
      checkin_id: input.checkin_id || null,
      // Story 11.4.1 Update: Auto-approve reviews with NO text and NO photos
      moderation_status: (!input.review_text?.trim() && (!input.photo_urls || input.photo_urls.length === 0)) ? 'approved' : 'pending',
      is_edited: false,
      edit_count: 0
    })
    .select('*')
    .single();

  if (error) {
    console.error('Submit review error:', error);
    throw new Error(error.message);
  }

  console.log('✅ Review created successfully:', data);

  // Get reviewer profile and business name for notifications
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data: business } = await supabase
    .from('businesses')
    .select('business_name')
    .eq('id', input.business_id)
    .single();

  const reviewerName = profile?.full_name || 'A customer';
  const businessName = business?.business_name || 'a business';

  // Notification to merchant is now handled in moderationService.ts upon approval
  // notifyMerchantNewReview(...) removed from here

  // US-11.4.1.5: Notify all admins about new pending review
  import('../services/moderationService').then(mod => {
    mod.notifyAdminsNewReview(data.id, reviewerName, businessName, user.id)
      .catch(err => console.error('Failed to send admin notification:', err));
  });

  return data;
}

/**
 * Get reviews for a business
 */
/**
 * Soft delete a review
 * Marks the review as deleted without removing from database
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to delete a review');
  }

  // Verify ownership
  const { data: review, error: fetchError } = await supabase
    .from('business_reviews')
    .select('id, user_id, deleted_at')
    .eq('id', reviewId)
    .single();

  if (fetchError || !review) {
    throw new Error('Review not found');
  }

  if (review.user_id !== user.id) {
    throw new Error('You can only delete your own reviews');
  }

  if (review.deleted_at) {
    throw new Error('This review has already been deleted');
  }

  // Perform soft delete
  const { data, error: deleteError } = await supabase
    .from('business_reviews')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', reviewId)
    .select();

  if (deleteError) {
    console.error('[ReviewService] Soft delete error:', deleteError);
    throw new Error('Could not delete review. Please try again.');
  }

  // STRICT CHECK: Ensure a row was actually updated
  if (!data || data.length === 0) {
    console.error('[ReviewService] Soft delete failed: No rows updated. Possible RLS blocking.');
    throw new Error('Could not delete review. You may not have permission.');
  }

  // Output success
  console.log(`[ReviewService] Review ${reviewId} soft deleted by ${user.id}`);
}

/**
 * Get reviews for a business (excludes deleted reviews by default)
 */
export async function getBusinessReviews(
  businessId: string,
  filters?: ReviewFilters & { includeDeleted?: boolean }
): Promise<BusinessReviewWithDetails[]> {
  console.log('📚 Fetching reviews for business:', businessId, filters);

  let query = supabase
    .from('business_reviews_with_details')
    .select('*')
    .eq('business_id', businessId)
    .eq('moderation_status', 'approved'); // Only show approved reviews publicly

  // Exclude deleted reviews by default
  if (!filters?.includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply filters
  if (filters) {
    if (filters.recommendation !== undefined) {
      query = query.eq('recommendation', filters.recommendation);
    }
    if (filters.has_text) {
      query = query.not('review_text', 'is', null);
    }
    if (filters.has_photo) {
      query = query.neq('photo_urls', '{}');
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
  }

  // Apply sorting
  const sortBy = filters?.sort_by || 'newest';
  switch (sortBy) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Get reviews error:', error);
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  // Transform data to match interface
  const reviews: BusinessReviewWithDetails[] = (data || []).map((review: any) => ({
    ...review,
    text: review.review_text // Remap for Review interface
  }));

  console.log(`✅ Fetched ${reviews.length} reviews`);
  return reviews;
}

/**
 * Get paginated reviews for infinite scroll
 */
export async function getBusinessReviewsPaginated(
  businessId: string,
  options: {
    offset: number;
    limit: number;
    filters?: ReviewFilters;
    includeDeleted?: boolean;
  }
): Promise<BusinessReviewWithDetails[]> {
  const { offset, limit, filters, includeDeleted } = options;
  console.log('📚 Fetching paginated reviews:', { businessId, offset, limit, filters });

  let query = supabase
    .from('business_reviews_with_details')
    .select('*')
    .eq('business_id', businessId);

  // Exclude deleted reviews by default
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Get current user for context-aware visibility
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;

  if (user) {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  // Visibility logic:
  // - Admin: Can see ALL reviews (no moderation filter)
  // - Author: Can see their own reviews (any status)
  // - Public: Only approved reviews
  if (!isAdmin) {
    // For non-admins: Show approved OR own pending reviews
    if (user) {
      // Logged-in non-admin: Show approved + own reviews (any status)
      // This requires an OR condition which isn't directly supported,
      // so we use a workaround: Fetch separately and merge, or use RPC.
      // Simpler approach: Use Supabase's .or() filter
      query = query.or(`moderation_status.eq.approved,user_id.eq.${user.id}`);
    } else {
      // Not logged in: Only approved reviews
      query = query.eq('moderation_status', 'approved');
    }
  }
  // If admin, no moderation filter is added (they see all)

  // Apply filters
  if (filters) {
    if (filters.recommendation !== undefined) {
      query = query.eq('recommendation', filters.recommendation);
    }
    if (filters.has_text) {
      query = query.not('review_text', 'is', null);
    }
    if (filters.has_photo) {
      // Check if photo_urls array is not null and length > 0
      query = query.not('photo_urls', 'is', null)
        .neq('photo_urls', '{}'); // Empty array check for Postgres arrays
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'newest';
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most-helpful':
        // Sort by helpful_count DESC, then created_at DESC as tie-breaker
        query = query.order('helpful_count', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }
  } else {
    // Default sort if no filters provided
    query = query.order('created_at', { ascending: false });
  }


  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Get paginated reviews error:', error);
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  // Transform data to match interface
  let reviews: BusinessReviewWithDetails[] = (data || []).map((review: any) => ({
    ...review,
    text: review.review_text, // Map DB column to interface property
    user_name: review.profiles?.full_name || review.reviewer_name || 'Anonymous',
    user_avatar: review.profiles?.avatar_url || review.user_avatar || null,
    user_city: review.profiles?.city || review.user_city || null,
    // View returns these fields directly, so we don't need to extract them from a relation
    // We keep the backup lookup just in case the view changes back to returning relations
    response_id: review.response_id || review.business_review_responses?.[0]?.id || null,
    response_text: review.response_text || review.business_review_responses?.[0]?.response_text || null,
    response_created_at: review.response_created_at || review.business_review_responses?.[0]?.created_at || null,
    response_updated_at: review.response_updated_at || review.business_review_responses?.[0]?.updated_at || null,
    helpful_count: review.helpful_count || 0,
    is_helpful_by_user: false // Default to false
  }));

  // Batch fetch user's helpful votes if logged in
  if (user && reviews.length > 0) {
    const reviewIds = reviews.map(r => r.id);
    const { data: userVotes } = await supabase
      .from('review_helpful_votes')
      .select('review_id')
      .eq('user_id', user.id)
      .in('review_id', reviewIds);

    if (userVotes && userVotes.length > 0) {
      const votedReviewIds = new Set(userVotes.map(v => v.review_id));
      reviews = reviews.map(r => ({
        ...r,
        is_helpful_by_user: votedReviewIds.has(r.id)
      }));
    }
  }

  return reviews;
}

/**
 * Get a single review by ID
 */
export async function getReview(reviewId: string): Promise<BusinessReviewWithDetails> {
  console.log('📖 Fetching review:', reviewId);

  const { data, error } = await supabase
    .from('business_reviews_with_details')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error) {
    console.error('❌ Get review error:', error);
    throw new Error(`Failed to fetch review: ${error.message}`);
  }

  if (data.deleted_at) {
    console.log('⚠️ Fetched review is deleted:', reviewId);
    // Depending on requirements, we might want to throw error or return it marked as deleted.
    // For now, returning it but logging warning. UI should handle it.
  }

  console.log('✅ Review fetched:', data);
  return data;
}

/**
 * Get user's own reviews
 */
export async function getUserReviews(userId?: string): Promise<BusinessReviewWithDetails[]> {
  console.log('📚 Fetching user reviews');

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from('business_reviews_with_details')
    .select('*')
    .eq('user_id', targetUserId)
    .is('deleted_at', null) // Exclude soft-deleted reviews
    .order('created_at', { ascending: false });

  // Deleted reviews are now filtered out

  if (error) {
    console.error('❌ Get user reviews error:', error);
    throw new Error(`Failed to fetch user reviews: ${error.message}`);
  }

  // Transform data to match interface
  const reviews: BusinessReviewWithDetails[] = (data || []).map((review: any) => ({
    ...review,
    text: review.review_text
  }));

  console.log(`✅ Fetched ${reviews.length} user reviews`);
  return reviews;
}

/**
 * Update a review
 */
export async function updateReview(
  reviewId: string,
  input: UpdateReviewInput
): Promise<BusinessReview> {
  console.log('✏️ Updating review:', reviewId, input);

  // Validate word count if text is provided
  if (input.review_text !== undefined) {
    const textValidation = validateReviewText(input.review_text);
    if (!textValidation.valid) {
      throw new Error(textValidation.error);
    }
  }

  // Get current review to check if can edit
  const { data: currentReview, error: fetchError } = await supabase
    .from('business_reviews')
    .select('created_at, user_id, deleted_at, review_text, photo_urls')
    .eq('id', reviewId)
    .single();

  if (fetchError) {
    console.error('❌ Fetch review error:', fetchError);
    throw new Error('Failed to fetch review for update');
  }

  if (currentReview.deleted_at) {
    throw new Error('Cannot edit a deleted review');
  }

  // Verify user owns the review
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== currentReview.user_id) {
    throw new Error('You can only edit your own reviews');
  }

  // Build update object (only include fields that are provided)
  const updateData: any = {};
  if (input.recommendation !== undefined) updateData.recommendation = input.recommendation;
  if (input.review_text !== undefined) updateData.review_text = input.review_text;
  if (input.photo_urls !== undefined) updateData.photo_urls = input.photo_urls;
  if (input.tags !== undefined) updateData.tags = input.tags;

  // Story 11.4.1: Helper to check if review content is empty
  const isReviewContentEmpty = (text: string | null, photos: string[] | null) => {
    return (!text?.trim() && (!photos || photos.length === 0));
  };

  // Check if content (text or photos) is being updated
  // If so, we need to re-evaluate moderation status
  if (input.review_text !== undefined || input.photo_urls !== undefined) {
    // Determine the NEW state
    const newText = input.review_text !== undefined ? input.review_text : currentReview.review_text;
    const newPhotos = input.photo_urls !== undefined ? input.photo_urls : currentReview.photo_urls;

    // Determine new status
    const newStatus = isReviewContentEmpty(newText, newPhotos) ? 'approved' : 'pending';

    updateData.moderation_status = newStatus;

    // If going back to pending (from rejected or approved), clear old rejection reason
    if (newStatus === 'pending') {
      updateData.rejection_reason = null;
      // Also clear moderator info since it needs re-review
      updateData.moderated_by = null;
      updateData.moderated_at = null;
    }

    console.log(`📝 Review content updated. Resetting status to: ${newStatus}`);
  }

  // Update the review
  const { data, error } = await supabase
    .from('business_reviews')
    .update(updateData)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) {
    console.error('❌ Update review error:', error);
    throw new Error(`Failed to update review: ${error.message}`);
  }

  console.log('✅ Review updated successfully:', data);
  return data;
}

// =====================================================
// REVIEW STATISTICS
// =====================================================

/**
 * Get review statistics for a business
 */
export async function getReviewStats(businessId: string): Promise<ReviewStats> {
  console.log('📊 Fetching review stats for business:', businessId);

  const { data, error } = await supabase
    .rpc('get_business_review_stats', { p_business_id: businessId })
    .single();

  if (error) {
    console.error('❌ Get review stats error:', error);
    throw new Error(`Failed to fetch review stats: ${error.message}`);
  }

  console.log('✅ Review stats fetched:', data);
  return data as ReviewStats;
}

/**
 * Get user's review activity
 */
export async function getUserReviewActivity(userId?: string): Promise<UserReviewActivity | null> {
  console.log('📊 Fetching user review activity');

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    targetUserId = user.id;
  }

  try {
    const { data, error } = await supabase
      .from('user_review_activity')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (error) {
      // If no reviews found or table doesn't exist, return null instead of error
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('⚠️ User review activity table not found or no data, returning null');
        return null;
      }
      console.error('❌ Get user activity error:', error);
      return null;
    }

    console.log('✅ User activity fetched:', data);
    return data;
  } catch (err) {
    console.error('❌ Error fetching user review activity:', err);
    return null;
  }
}

// =====================================================
// BUSINESS OWNER RESPONSES
// =====================================================

/**
 * Create a response to a review (business owners only)
 */
export async function createResponse(input: CreateResponseInput): Promise<BusinessReviewResponse> {
  console.log('💬 Creating review response:', input);

  // Validate word count
  if (!validateWordCount(input.response_text, RESPONSE_TEXT_WORD_LIMIT)) {
    throw new Error(`Response text must be ${RESPONSE_TEXT_WORD_LIMIT} words or less`);
  }

  const { data, error } = await supabase
    .from('business_review_responses')
    .insert({
      review_id: input.review_id,
      business_id: input.business_id,
      response_text: input.response_text,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Create response error:', error);
    throw new Error(`Failed to create response: ${error.message}`);
  }

  console.log('✅ Response created successfully:', data);

  // Get review details to notify the reviewer
  console.log('🔔 Fetching review details for notification...');
  const { data: review, error: reviewFetchError } = await supabase
    .from('business_reviews_with_details')
    .select('user_id, business_name, business_id')
    .eq('id', input.review_id)
    .single();

  console.log('🔔 Review fetch result:', { review, reviewFetchError });

  if (review) {
    // Send notification to user (async, don't await)
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔔 Current user for notification:', user?.id);
    if (user) {
      notifyUserReviewResponse(
        input.review_id,
        review.user_id,
        review.business_name,
        review.business_id,
        user.id // Pass sender ID (Business Owner)
      ).catch(err => console.error('❌ Failed to send response notification:', err));
    } else {
      console.log('❌ No authenticated user found for notification');
    }
  } else {
    console.log('❌ Review not found, cannot send notification');
  }

  return data;
}

/**
 * Update a response
 */
export async function updateResponse(
  responseId: string,
  input: UpdateResponseInput
): Promise<BusinessReviewResponse> {
  console.log('✏️ Updating response:', responseId, input);

  // Validate word count
  if (!validateWordCount(input.response_text, RESPONSE_TEXT_WORD_LIMIT)) {
    throw new Error(`Response text must be ${RESPONSE_TEXT_WORD_LIMIT} words or less`);
  }

  const { data, error } = await supabase
    .from('business_review_responses')
    .update({ response_text: input.response_text })
    .eq('id', responseId)
    .select()
    .single();

  if (error) {
    console.error('❌ Update response error:', error);
    throw new Error(`Failed to update response: ${error.message}`);
  }

  console.log('✅ Response updated successfully:', data);
  return data;
}

/**
 * Delete a response
 */
export async function deleteResponse(responseId: string): Promise<void> {
  console.log('🗑️ Deleting response:', responseId);

  const { error } = await supabase
    .from('business_review_responses')
    .delete()
    .eq('id', responseId);

  if (error) {
    console.error('❌ Delete response error:', error);
    throw new Error(`Failed to delete response: ${error.message}`);
  }

  console.log('✅ Response deleted successfully');
}

// =====================================================
// CHECK-IN VERIFICATION
// =====================================================

/**
 * Get user's check-ins for a business
 */
export async function getUserCheckins(businessId: string): Promise<any[]> {
  console.log('📍 Fetching user check-ins for business:', businessId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('business_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .order('checked_in_at', { ascending: false });

  if (error) {
    console.error('❌ Get check-ins error:', error);
    throw new Error(`Failed to fetch check-ins: ${error.message}`);
  }

  console.log(`✅ Fetched ${data.length} check-ins`);
  return data;
}

/**
 * Check if user has already reviewed a business
 */
export async function hasUserReviewed(businessId: string): Promise<boolean> {
  console.log('🔍 Checking if user has reviewed business:', businessId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('business_reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Check review error:', error);
    return false;
  }

  const hasReviewed = !!data;
  console.log(`✅ User ${hasReviewed ? 'has' : 'has not'} reviewed this business`);
  return hasReviewed;
}

/**
 * Get user's existing review for a business
 */
export async function getUserBusinessReview(
  businessId: string
): Promise<BusinessReviewWithDetails | null> {
  console.log('🔍 Getting user review for business:', businessId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Use maybeSingle() instead of single() to avoid 406 errors
  // maybeSingle() returns null if no rows found, doesn't throw on 0 or multiple rows
  const { data, error } = await supabase
    .from('business_reviews_with_details')
    .select('*')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ Get user review error:', error);
    // Return null instead of throwing to allow graceful degradation
    return null;
  }

  if (data) {
    console.log('✅ User review found');
  } else {
    console.log('ℹ️ No existing review found');
  }

  return data;
}

/**
 * Log a review share
 */
export async function logReviewShare(
  reviewId: string,
  friendIds: string[] = [],
  sharedVia: string = 'app'
): Promise<void> {
  console.log('🔄 Logging review share:', reviewId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Don't log if not authenticated (shouldn't happen for internal share)

  const { error } = await supabase
    .from('review_shares')
    .insert({
      review_id: reviewId,
      user_id: user.id,
      shared_via: sharedVia,
      friend_ids: friendIds
    });

  if (error) {
    console.error('❌ Log share error:', error);
    // Silent fail - don't block UI
  }
}

// =====================================================
// FEATURED REVIEWS (Story 11.3.6)
// =====================================================

/**
 * Feature/Pin a review (business owner only)
 */
export async function featureReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('business_reviews')
    .update({
      is_featured: true,
      featured_at: new Date().toISOString(),
      featured_by: user.id
    })
    .eq('id', reviewId);

  if (error) {
    if (error.message.includes('Maximum 3')) {
      throw new Error('You can only feature up to 3 reviews. Unpin one first.');
    }
    throw error;
  }
}

/**
 * Unfeature/Unpin a review
 */
export async function unfeatureReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('business_reviews')
    .update({
      is_featured: false,
      featured_at: null,
      featured_by: null
    })
    .eq('id', reviewId);

  if (error) throw error;
}

/**
 * Get featured reviews for a business
 */
export async function getFeaturedReviews(businessId: string): Promise<BusinessReviewWithDetails[]> {
  const { data, error } = await supabase
    .from('business_reviews_with_details')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_featured', true)
    .is('deleted_at', null)
    .order('featured_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((review: any) => ({
    ...review,
    user_name: review.profiles?.full_name || 'Anonymous',
    user_avatar: review.profiles?.avatar_url || null,
    user_city: review.profiles?.city || null,
    response_id: review.business_review_responses?.[0]?.id || null,
    response_text: review.business_review_responses?.[0]?.response_text || null,
    response_created_at: review.business_review_responses?.[0]?.created_at || null,
    response_updated_at: review.business_review_responses?.[0]?.updated_at || null,
    helpful_count: review.helpful_count || 0
  }));
}

/**
 * Get popular tags for a business
 */
export async function getPopularTags(businessId: string): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await supabase
    .from('business_reviews')
    .select('tags')
    .eq('business_id', businessId)
    .not('tags', 'is', null)
    .is('deleted_at', null);

  if (error) throw error;

  const tagCounts: Record<string, number> = {};
  data.forEach((review: any) => {
    if (Array.isArray(review.tags)) {
      review.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Get count of reviews with photos
 */
export async function getPhotoReviewCount(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .not('photo_urls', 'is', null)
    .neq('photo_urls', '{}');

  if (error) throw error;
  return count || 0;
}

// Export service as default
export default {
  // Utility functions
  countWords,
  validateWordCount,
  canEditReview,

  // Review CRUD
  createReview,
  getBusinessReviews,
  getBusinessReviewsPaginated, // Ensure this is exported
  getReview,
  getUserReviews,
  updateReview,
  deleteReview,

  // Statistics
  getReviewStats,
  getUserReviewActivity,
  logReviewShare,

  // Responses
  createResponse,
  updateResponse,
  deleteResponse,

  // Check-ins
  getUserCheckins,
  hasUserReviewed,
  getUserBusinessReview,

  // Featured Reviews
  featureReview,
  unfeatureReview,
  getFeaturedReviews,

  // Enhanced Filters
  getPopularTags,
  getPhotoReviewCount,
};
