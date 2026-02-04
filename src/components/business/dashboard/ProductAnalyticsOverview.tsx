import React, { useMemo } from 'react';
import { ProductAnalyticsSummary } from '../../../services/productAnalyticsService';

interface ProductAnalyticsOverviewProps {
    metrics: ProductAnalyticsSummary | null;
    isLoading: boolean;
}

export const ProductAnalyticsOverview: React.FC<ProductAnalyticsOverviewProps> = ({ metrics, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                ))}
            </div>
        );
    }

    if (!metrics) return null;

    const cards = [
        { label: 'Total Views', value: metrics.total_views, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
        { label: 'Total Likes', value: metrics.total_likes, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/20' },
        { label: 'Total Comments', value: metrics.total_comments, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
        { label: 'Total Shares', value: metrics.total_shares, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                    <div className={`mt-2 text-2xl font-bold ${card.color}`}>
                        {new Intl.NumberFormat().format(card.value)}
                    </div>
                </div>
            ))}
        </div>
    );
};
