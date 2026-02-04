import React, { useEffect, useState } from 'react';
import { productAnalyticsService, ProductAnalyticsSummary, TopProductView, TopProductEngagement } from '../../../services/productAnalyticsService';
import { ProductAnalyticsOverview } from './ProductAnalyticsOverview';
import { TopProductsList } from './TopProductsList';

interface ProductAnalyticsDashboardProps {
    businessId: string;
}

export const ProductAnalyticsDashboard: React.FC<ProductAnalyticsDashboardProps> = ({ businessId }) => {
    const [summary, setSummary] = useState<ProductAnalyticsSummary | null>(null);
    const [topViews, setTopViews] = useState<TopProductView[]>([]);
    const [topEngagement, setTopEngagement] = useState<TopProductEngagement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [summaryData, viewsData, engagementData] = await Promise.all([
                    productAnalyticsService.getBusinessSummary(businessId),
                    productAnalyticsService.getTopProductsByViews(businessId),
                    productAnalyticsService.getTopProductsByEngagement(businessId)
                ]);

                setSummary(summaryData);
                setTopViews(viewsData);
                setTopEngagement(engagementData);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (businessId) {
            fetchData();
        }
    }, [businessId]);

    return (
        <div className="space-y-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Performance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Track views and engagement for your products over the last 30 days.
                </p>
            </div>

            {/* Metrics Overview */}
            <ProductAnalyticsOverview metrics={summary} isLoading={isLoading} />

            {/* Top Lists */}
            <TopProductsList
                viewsData={topViews}
                engagementData={topEngagement}
                isLoading={isLoading}
            />
        </div>
    );
};
