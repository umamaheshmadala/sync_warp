import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Share2, MapPin, Star, Ticket, Heart, User, ExternalLink } from 'lucide-react';
import { EngagementEvent } from '../../../types/engagement';
import { useBusinessEngagement } from '../../../hooks/useBusinessEngagement';

interface BusinessEngagementLogProps {
    businessId: string;
}

export const BusinessEngagementLog: React.FC<BusinessEngagementLogProps> = ({ businessId }) => {
    const { events, isLoading, error, hasMore, loadMore, refresh } = useBusinessEngagement(businessId);

    const getEventIcon = (type: EngagementEvent['event_type']) => {
        switch (type) {
            case 'share':
                return <Share2 className="w-4 h-4 text-purple-600" />;
            case 'checkin':
                return <MapPin className="w-4 h-4 text-green-600" />;
            case 'review':
                return <Star className="w-4 h-4 text-yellow-500 fill-current" />;
            case 'redemption':
                return <Ticket className="w-4 h-4 text-orange-600" />;
            case 'favorite':
            case 'favorite_offer':
            case 'favorite_product':
                return <Heart className="w-4 h-4 text-pink-500 fill-current" />;
            default:
                return <ExternalLink className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEventBadgeClass = (type: EngagementEvent['event_type']) => {
        switch (type) {
            case 'share':
                return 'bg-purple-100 text-purple-800';
            case 'checkin':
                return 'bg-green-100 text-green-800';
            case 'review':
                return 'bg-yellow-100 text-yellow-800';
            case 'redemption':
                return 'bg-orange-100 text-orange-800';
            case 'favorite':
            case 'favorite_offer':
            case 'favorite_product':
                return 'bg-pink-100 text-pink-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.preventDefault();
        refresh();
    };

    if (isLoading && events.length === 0) {
        return (
            <div className="bg-white rounded-lg border p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg border p-6 text-center">
                <p className="text-red-500">Failed to load engagement log.</p>
                <p className="text-sm text-gray-500 mt-1">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Customer Engagement Log</h3>
                    <p className="text-sm text-gray-500 mt-1">Real-time tracking of customer interactions</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="Refresh Log"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                </button>
            </div>

            <div className="divide-y divide-gray-100">
                {events.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No engagement activity yet.</p>
                    </div>
                ) : (
                    events.map((event) => (
                        <div key={event.event_id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-4">
                                {/* User Avatar */}
                                <div className="flex-shrink-0">
                                    {event.user_avatar ? (
                                        <img
                                            src={event.user_avatar}
                                            alt={event.user_name}
                                            className="w-10 h-10 rounded-full object-cover border"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold border border-indigo-200">
                                            {event.user_name?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {event.user_name}
                                        </p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getEventBadgeClass(event.event_type)}`}>
                                            {getEventIcon(event.event_type)}
                                            {event.event_type.replace('favorite_', 'Fav ')}
                                        </span>
                                        <p className="text-sm text-gray-600 truncate">
                                            {event.details}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Load More Footer */}
            {hasMore && (
                <div className="p-4 border-t bg-gray-50 text-center">
                    <button
                        onClick={() => loadMore()}
                        disabled={isLoading}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'View Older Activity'}
                    </button>
                </div>
            )}
        </div>
    );
};
