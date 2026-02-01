
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { ReviewModerationWidget } from '../../components/admin/ReviewModerationWidget';
import { useBusinessStats } from '../../hooks/useAdminBusinessList';
import { BusinessStatsCards } from '../../components/admin/business-management/BusinessStatsCards';
import { OverviewCards } from '../../components/admin/analytics/OverviewCards';
import { useQuery } from '@tanstack/react-query';
import { getOverviewMetrics } from '../../services/adminAnalyticsService';

export default function AdminDashboard() {
    const navigate = useNavigate();

    // AdminLayout handles authentication check, so we can assume admin access here
    const { data: stats } = useBusinessStats({ enabled: true });

    const { data: analyticsOverview } = useQuery({
        queryKey: ['admin-analytics-overview'],
        queryFn: getOverviewMetrics,
        staleTime: 5 * 60 * 1000
    });

    const handleAnalyticsClick = (cardId: string) => {
        const tabMap: Record<string, string> = {
            'reviews': 'trends',
            'moderation': 'moderation',
            'approval': 'moderation',
            'fraud': 'fraud'
        };
        const tab = tabMap[cardId] || 'trends';
        navigate(`/admin/analytics/reviews?tab=${tab}`);
    };

    return (
        <div className="min-w-0 max-w-full px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-500 mt-1">System-wide performance and activity summary.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Column 1: Analytics & Activity */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Analytics & Insights</h2>
                        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                            <OverviewCards data={analyticsOverview} onCardClick={handleAnalyticsClick} />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => navigate('/admin/analytics/reviews')}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    View Full Analytics &rarr;
                                </button>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            Latest Activity
                        </h2>
                        <ReviewModerationWidget />
                    </section>
                </div>

                {/* Column 2: Business & Quick Access */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Business Overview</h2>
                        <BusinessStatsCards
                            stats={stats}
                            onCardClick={(status) => navigate(`/admin/businesses?tab=${status}`)}
                            className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => navigate('/admin/businesses')}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                View Full List &rarr;
                            </button>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Access</h2>
                        <div className="bg-white rounded-lg border p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/audit-log')}>
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-3">
                                <ShieldAlert size={24} />
                            </div>
                            <h3 className="font-semibold text-gray-900">Global Audit Log</h3>
                            <p className="text-sm text-gray-500 mt-1">View comprehensive log of all admin actions</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
