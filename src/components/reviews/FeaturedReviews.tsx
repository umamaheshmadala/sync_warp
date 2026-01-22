import React from 'react';
import { Pin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedReviews } from '@/services/reviewService';
import ReviewCard from './ReviewCard';

interface FeaturedReviewsProps {
    businessId: string;
    isOwner: boolean;
    onRefresh?: () => void;
}

export function FeaturedReviews({ businessId, isOwner, onRefresh }: FeaturedReviewsProps) {
    const { data: featuredReviews = [], isLoading, refetch } = useQuery({
        queryKey: ['featured-reviews', businessId],
        queryFn: () => getFeaturedReviews(businessId),
        refetchOnWindowFocus: false
    });

    const handleRefresh = async () => {
        await refetch();
        onRefresh?.();
    };

    if (isLoading) {
        // Optional: Return simplified skeleton if needed, or null to avoid layout shift
        // For now, returning null for cleaner loading state
        return null;
    }

    if (!featuredReviews || featuredReviews.length === 0) return null;

    return (
        <div className="mb-6 bg-indigo-50/50 rounded-xl border border-indigo-100 p-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-100 p-1.5 rounded-full">
                    <Pin className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                </div>
                <h3 className="font-semibold text-indigo-900">Featured Reviews</h3>
            </div>

            <div className="space-y-4">
                {featuredReviews.map(review => (
                    <ReviewCard
                        key={review.id}
                        review={review}
                        isFeatured={true}
                        isBusinessOwner={isOwner}
                        showFeaturedBadge={true}
                        onFeatureToggle={handleRefresh}
                    />
                ))}
            </div>
        </div>
    );
}
