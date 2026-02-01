import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBusiness } from '../../services/searchService';
import { Ticket, Users, ShieldCheck } from 'lucide-react';
import { Business } from '../../types/business';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { VerificationBadge } from '../business/VerificationBadge';
import { cn } from '../../lib/utils';
import { StorefrontShareButton } from '../Sharing/StorefrontShareButton';
import FollowButton from '../following/FollowButton';
import { useBusinessFollowing } from '../../hooks/useBusinessFollowing';

interface SearchBusinessCardProps {
    business: Business | SearchBusiness;
    className?: string;
    onShare?: (business: Business | SearchBusiness) => void;
    onFollow?: (business: Business | SearchBusiness) => void;
}

export function SearchBusinessCard({
    business,
    className,
    onShare,
    onFollow
}: SearchBusinessCardProps) {
    const navigate = useNavigate();
    const { getBusinessUrl } = useBusinessUrl();
    const { isFollowing } = useBusinessFollowing();

    const isFollowed = isFollowing(business.id);

    const recommenderCount = (typeof business.approved_review_count === 'number')
        ? business.approved_review_count
        : (business.review_count || 0);

    const totalActiveCount = (business.activeCouponsCount || 0) + (business.activeOffersCount || 0);

    return (
        <div
            onClick={() => navigate(getBusinessUrl(business.id, business.business_name))}
            className={cn(
                "bg-white rounded-2xl shadow-sm border border-gray-100 p-4 pl-12 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer relative overflow-visible ml-8",
                className
            )}
            style={{ minHeight: '100px' }}
        >
            {/* Pop-out Avatar Section */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-white shadow-lg bg-white overflow-hidden flex-shrink-0 z-10">
                {business.logo_url ? (
                    <img
                        src={getOptimizedImageUrl(business.logo_url, 200)}
                        alt={`${business.business_name} logo`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                        <span className="text-3xl">🏢</span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 pl-2">
                {/* Row 1: Name + Badge */}
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-lg truncate leading-tight">
                        {business.business_name}
                    </h3>
                    <VerificationBadge
                        status={business.claim_status || 'unclaimed'}
                        phoneVerified={business.phone_verified}
                        size="sm"
                        showTooltip={true}
                    />
                </div>

                {/* Row 2: City | Stats */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="text-gray-500 font-medium truncate max-w-[150px]">
                        {business.city || 'Location N/A'}
                    </span>

                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>

                    {/* Active Offers */}
                    <div className="flex items-center gap-1.5" title="Active Offers">
                        <Ticket className="w-5 h-5 text-indigo-500" />
                        <span className="font-semibold">{totalActiveCount}</span>
                    </div>

                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>

                    {/* Recommenders */}
                    <div className="flex items-center gap-1.5" title="People Recommending">
                        <Users className="w-5 h-5 text-teal-500" />
                        <span className="font-semibold">{recommenderCount}</span>
                    </div>
                </div>
            </div>

            {/* Actions Section */}
            <div
                className="flex items-center gap-2 pl-4 border-l border-gray-100 self-stretch"
                onClick={(e) => e.stopPropagation()} // Prevent card click when clicking area
            >
                <StorefrontShareButton
                    businessId={business.id}
                    businessName={business.business_name}
                    businessImageUrl={business.logo_url}
                    showLabel={false}
                    showIcon={true}
                    showModal={true}
                    className="p-2.5 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-none shadow-none"
                    variant="ghost"
                />

                <FollowButton
                    businessId={business.id}
                    businessName={business.business_name}
                    showLabel={false}
                    variant="ghost"
                    className={cn(
                        "p-2.5 w-10 h-10 rounded-full border-none shadow-none transition-colors",
                        isFollowed
                            ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                    )}
                    onFollowChange={(isFollowing) => {
                        if (onFollow) onFollow(business);
                    }}
                />
            </div>
        </div>
    );
}
