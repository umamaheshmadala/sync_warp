import React, { useEffect, useState } from 'react';
import { getApiUsageStats, ApiUsageStats } from '../../services/apiUsageService';
import { AlertCircle, CheckCircle, Database, DollarSign, Activity } from 'lucide-react';

export default function ApiUsageWidget() {
    const [stats, setStats] = useState<ApiUsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await getApiUsageStats('google_places');
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) return <div className="p-4 bg-white rounded-xl shadow-sm animate-pulse h-48"></div>;
    if (!stats) return <div className="p-4 bg-white rounded-xl shadow-sm text-gray-500">Usage data not available</div>;

    const getStatusColor = (percent: number) => {
        if (percent >= 95) return 'text-red-600 bg-red-50 border-red-200';
        if (percent >= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    const statusColor = getStatusColor(stats.percentageUsed);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Google Places Usage</h3>
                        <p className="text-sm text-gray-500">Current Month</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                    {stats.isAvailable ? 'Active' : 'Quota Exceeded'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Database size={16} />
                        <span className="text-xs font-medium uppercase">Requests</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {stats.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {stats.autocompleteRequests} Autocomplete • {stats.detailsRequests} Details
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <DollarSign size={16} />
                        <span className="text-xs font-medium uppercase">Est. Cost</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        ${stats.estimatedCost.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Based on current pricing
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Monthly Quota</span>
                    <span className="text-gray-500">
                        {stats.percentageUsed}% ({stats.totalRequests} / {stats.monthlyLimit})
                    </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${stats.percentageUsed > 90 ? 'bg-red-500' :
                                stats.percentageUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(stats.percentageUsed, 100)}%` }}
                    />
                </div>
                {stats.percentageUsed >= 80 && (
                    <div className="flex items-start gap-2 mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>Usage is high. Consider optimizing queries or increasing the limit.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
