import { useQuery } from '@tanstack/react-query';
import { Share2, TrendingUp, Users, MousePointerClick } from 'lucide-react';
import { getUserSharingAnalytics } from '../../services/analyticsService';

/**
 * Sharing Analytics Dashboard
 * Story 9.7.6: Deal Sharing Analytics
 * 
 * Displays comprehensive analytics for deal sharing including:
 * - Total shares, click rate, conversion rate
 * - Most shared offers
 * - Most engaged friends
 */
export function SharingAnalyticsDashboard() {
    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ['sharing-analytics'],
        queryFn: getUserSharingAnalytics,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Failed to load analytics. Please try again later.</p>
            </div>
        );
    }

    if (!analytics) return null;

    const hasShares = analytics.total_shares > 0;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Shares"
                    value={analytics.total_shares}
                    icon={<Share2 className="w-5 h-5" />}
                />
                <StatCard
                    title="Click Rate"
                    value={`${analytics.click_through_rate}%`}
                    icon={<MousePointerClick className="w-5 h-5" />}
                />
                <StatCard
                    title="Conversion Rate"
                    value={`${analytics.conversion_rate}%`}
                    icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard
                    title="Engaged Friends"
                    value={analytics.most_engaged_friends?.length || 0}
                    icon={<Users className="w-5 h-5" />}
                />
            </div>

            {!hasShares && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                    <Share2 className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Start Sharing Deals!
                    </h3>
                    <p className="text-gray-600">
                        Share deals with your friends to see analytics here.
                    </p>
                </div>
            )}

            {/* Most Shared Offers */}
            {hasShares && analytics.most_shared_offers && analytics.most_shared_offers.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Your Most Shared Offers</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {analytics.most_shared_offers.map((offer) => (
                                <div key={offer.id} className="flex items-center gap-4">
                                    <img
                                        src={offer.image_url || '/placeholder-offer.png'}
                                        alt={offer.title}
                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{offer.title}</div>
                                        <div className="text-sm text-gray-500">
                                            Shared {offer.share_count} {offer.share_count === 1 ? 'time' : 'times'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Most Engaged Friends */}
            {hasShares && analytics.most_engaged_friends && analytics.most_engaged_friends.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Most Engaged Friends</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Friends who interact most with your shared deals
                        </p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {analytics.most_engaged_friends.map((friend) => (
                                <div key={friend.id} className="flex items-center gap-4">
                                    <img
                                        src={friend.avatar_url || '/default-avatar.png'}
                                        alt={friend.full_name}
                                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900">{friend.full_name}</div>
                                        <div className="text-sm text-gray-500">
                                            {friend.shares_received} {friend.shares_received === 1 ? 'share' : 'shares'} • {' '}
                                            {friend.clicks} {friend.clicks === 1 ? 'click' : 'clicks'} • {' '}
                                            {friend.conversions} {friend.conversions === 1 ? 'conversion' : 'conversions'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Share Method Breakdown */}
            {hasShares && analytics.shares_by_method && Object.keys(analytics.shares_by_method).length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Share Methods</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {Object.entries(analytics.shares_by_method).map(([method, count]) => (
                                <div key={method} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {method === 'notification' && <Share2 className="w-4 h-4 text-blue-500" />}
                                        {method === 'message' && <Users className="w-4 h-4 text-green-500" />}
                                        <span className="text-gray-700 capitalize">{method}</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">{title}</div>
                <div className="text-gray-400">{icon}</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
    );
}
