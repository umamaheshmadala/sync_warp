import { ClipboardList, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPendingReviewCount, getDailyModerationStats } from '@/services/moderationService';
import { getPendingReports } from '@/services/reportService';

export function ModerationStats() {
    const { data: pendingCount } = useQuery({
        queryKey: ['pending-review-count'],
        queryFn: getPendingReviewCount,
        refetchInterval: 30000
    });

    const { data: reportData } = useQuery({
        queryKey: ['pending-reports'],
        queryFn: getPendingReports
    });

    const { data: dailyStats } = useQuery({
        queryKey: ['daily-moderation-stats'],
        queryFn: getDailyModerationStats
    });

    const reportCount = reportData?.reportCount || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                    <h3 className="text-2xl font-bold mt-1 text-gray-900">{pendingCount || 0}</h3>
                </div>
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    <ClipboardList size={20} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Reported Reviews</p>
                    <h3 className="text-2xl font-bold mt-1 text-gray-900">{reportCount}</h3>
                </div>
                <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <AlertCircle size={20} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Approved Today</p>
                    <h3 className="text-2xl font-bold mt-1 text-green-600">{dailyStats?.approved || 0}</h3>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <CheckCircle size={20} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Rejected Today</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-600">{dailyStats?.rejected || 0}</h3>
                </div>
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                    <XCircle size={20} />
                </div>
            </div>
        </div>
    );
}
