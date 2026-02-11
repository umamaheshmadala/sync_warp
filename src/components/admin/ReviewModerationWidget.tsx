import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight, CheckCircle, RefreshCw, AlertCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPendingReviewCount, getDailyModerationStats } from '../../services/moderationService';
import { getPendingReports } from '../../services/reportService';
import { Button } from '@/components/ui/button';

export function ReviewModerationWidget() {

    const { data: pendingCount, refetch: refetchPending, isLoading: loadingPending } = useQuery({
        queryKey: ['pending-review-count'],
        queryFn: getPendingReviewCount,
        refetchInterval: 30000
    });

    const { data: reportData, refetch: refetchReports, isLoading: loadingReports } = useQuery({
        queryKey: ['pending-reports'],
        queryFn: getPendingReports
    });

    const { data: dailyStats, refetch: refetchDaily, isLoading: loadingDaily } = useQuery({
        queryKey: ['daily-moderation-stats'],
        queryFn: getDailyModerationStats
    });

    const handleRefresh = () => {
        refetchPending();
        refetchReports();
        refetchDaily();
    };

    const isLoading = loadingPending || loadingReports || loadingDaily;
    const reportCount = reportData?.reportCount || 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ClipboardList size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Review Moderation</h3>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        className="text-gray-400 hover:text-gray-700"
                        title="Refresh stats"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Pending Reviews */}
                    <Link
                        to="/admin/moderation?tab=pending"
                        className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 group block"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-500">Pending</span>
                            <Clock size={16} className="text-gray-400 group-hover:text-indigo-500" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            {loadingPending ? (
                                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-2xl font-bold text-gray-900">{pendingCount || 0}</span>
                            )}
                        </div>
                    </Link>

                    {/* Reported Reviews */}
                    <Link
                        to="/admin/moderation?tab=reported"
                        className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 group block"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-500">Reported</span>
                            <AlertCircle size={16} className="text-gray-400 group-hover:text-amber-500" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            {loadingReports ? (
                                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-2xl font-bold text-gray-900">{reportCount}</span>
                            )}
                        </div>
                    </Link>

                    {/* Approved Today */}
                    <Link
                        to="/admin/moderation?tab=audit"
                        className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 group block"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-500">Approved</span>
                            <CheckCircle size={16} className="text-gray-400 group-hover:text-green-500" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            {loadingDaily ? (
                                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-2xl font-bold text-green-600">{dailyStats?.approved || 0}</span>
                            )}
                            <span className="text-xs text-gray-400">today</span>
                        </div>
                    </Link>

                    {/* Rejected Today */}
                    <Link
                        to="/admin/moderation?tab=audit"
                        className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 group block"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-500">Rejected</span>
                            <XCircle size={16} className="text-gray-400 group-hover:text-red-500" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            {loadingDaily ? (
                                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-2xl font-bold text-red-600">{dailyStats?.rejected || 0}</span>
                            )}
                            <span className="text-xs text-gray-400">today</span>
                        </div>
                    </Link>
                </div>

                {pendingCount === 0 && reportCount === 0 && (
                    <div className="mt-4 flex items-center justify-center text-sm text-green-600 gap-2 bg-green-50 p-2 rounded-lg">
                        <CheckCircle size={16} />
                        <span>All caught up!</span>
                    </div>
                )}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
                <Link
                    to="/admin/moderation"
                    className="w-full flex items-center justify-between text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    View Moderation Dashboard
                    <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
}
