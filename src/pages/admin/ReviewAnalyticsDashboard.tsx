import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewCards } from '@/components/admin/analytics/OverviewCards';
import { ReviewTrendChart } from '@/components/admin/analytics/ReviewTrendChart';
import { TopBusinessesTable } from '@/components/admin/analytics/TopBusinessesTable';
import { ModerationStatsPanel } from '@/components/admin/analytics/ModerationStatsPanel';
import { FraudMetricsPanel } from '@/components/admin/analytics/FraudMetricsPanel';
// Placeholder for future components to avoid build errors if not yet created in this batch
import { ResponseRatePanel } from '@/components/admin/analytics/ResponseRatePanel';
import { GeoDistributionPanel } from '@/components/admin/analytics/GeoDistributionPanel';
import { EngagementMetricsPanel } from '@/components/admin/analytics/EngagementMetricsPanel';
import {
    getOverviewMetrics,
    getReviewTrends,
    getTopReviewedBusinesses,
    getModerationStats,
    getFraudMetrics,
    getResponseRateData,
    getGeographicData,
    getEngagementMetrics
} from '@/services/adminAnalyticsService';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useSearchParams } from 'react-router-dom';

export function ReviewAnalyticsDashboard() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'trends';

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value });
    };

    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['admin-analytics-overview'],
        queryFn: getOverviewMetrics,
        refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
    });
    const { data: trends } = useQuery({
        queryKey: ['admin-analytics-trends'],
        queryFn: () => getReviewTrends(30)
    });

    const { data: topBusinesses } = useQuery({
        queryKey: ['admin-analytics-top-businesses'],
        queryFn: () => getTopReviewedBusinesses(20)
    });

    const { data: modStats } = useQuery({
        queryKey: ['admin-analytics-moderation'],
        queryFn: getModerationStats
    });

    const { data: fraudMetrics } = useQuery({
        queryKey: ['admin-analytics-fraud'],
        queryFn: getFraudMetrics
    });

    // Placeholder data for sections not fully implemented yet in UI
    const { data: responseData } = useQuery({
        queryKey: ['admin-analytics-responses'],
        queryFn: getResponseRateData
    });

    const { data: geoData } = useQuery({
        queryKey: ['admin-analytics-geo'],
        queryFn: getGeographicData
    });

    const { data: engagementData } = useQuery({
        queryKey: ['admin-analytics-engagement'],
        queryFn: getEngagementMetrics
    });

    if (overviewLoading) return <div className="p-10 text-center">Loading Analytics...</div>;

    return (
        <div className="container py-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Review Analytics</h1>
                    <span className="text-sm text-gray-500">Live Platform Data</span>
                </div>
            </div>

            {/* Overview Cards */}
            <OverviewCards data={overview} />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                    <TabsTrigger value="businesses">Top Businesses</TabsTrigger>
                    <TabsTrigger value="moderation">Moderation</TabsTrigger>
                    <TabsTrigger value="fraud">Fraud</TabsTrigger>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    <TabsTrigger value="geography">Geography</TabsTrigger>
                </TabsList>

                <TabsContent value="trends" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Volume Trends (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ReviewTrendChart data={trends || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="businesses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Most Reviewed Businesses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TopBusinessesTable data={topBusinesses || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="moderation" className="space-y-4">
                    <ModerationStatsPanel data={modStats} />
                </TabsContent>

                <TabsContent value="fraud" className="space-y-4">
                    <FraudMetricsPanel data={fraudMetrics} />
                </TabsContent>

                <TabsContent value="engagement" className="space-y-4">
                    <Tabs defaultValue="responses">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="responses">Response Rates</TabsTrigger>
                            <TabsTrigger value="metrics">User Metrics</TabsTrigger>
                        </TabsList>
                        <TabsContent value="responses" className="mt-4">
                            <ResponseRatePanel data={responseData} />
                        </TabsContent>
                        <TabsContent value="metrics" className="mt-4">
                            <EngagementMetricsPanel data={engagementData} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="geography" className="space-y-4">
                    <GeoDistributionPanel data={geoData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
