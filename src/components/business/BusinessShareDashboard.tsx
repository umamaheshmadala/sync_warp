/**
 * BusinessShareDashboard
 * 
 * Story 10.1.10: Business Owner Share Dashboard
 * 
 * Displays share analytics for a business including:
 * - Summary cards (Total Shares, This Week, This Month, CTR, Conversion)
 * - Share method breakdown
 * - Top shared items
 * - Daily share trend
 * - Recent shares
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Share2,
    TrendingUp,
    MousePointerClick,
    Calendar,
    Clock,
    Copy,
    MessageCircle,
    Globe,
    Mail,
    ExternalLink
} from 'lucide-react';
import { useBusinessShareAnalytics, BusinessShareAnalytics } from '../../hooks/useShareAnalytics';

interface BusinessShareDashboardProps {
    businessId: string;
    businessName?: string;
}

export function BusinessShareDashboard({ businessId, businessName }: BusinessShareDashboardProps) {
    const { data: analytics, isLoading, error } = useBusinessShareAnalytics(businessId);

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Failed to load share analytics.</p>
            </div>
        );
    }

    if (!analytics) return null;

    const hasShares = analytics.totalShares > 0;

    return (
        <div className="bg-white rounded-lg border p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Share Analytics</h3>
                </div>
                {businessName && (
                    <span className="text-sm text-gray-500">{businessName}</span>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                    title="Total Shares"
                    value={analytics.totalShares}
                    icon={<Share2 className="w-4 h-4" />}
                    color="purple"
                />
                <StatCard
                    title="This Week"
                    value={analytics.sharesThisWeek}
                    icon={<Calendar className="w-4 h-4" />}
                    color="blue"
                />
                <StatCard
                    title="This Month"
                    value={analytics.sharesThisMonth}
                    icon={<Clock className="w-4 h-4" />}
                    color="green"
                />
                <StatCard
                    title="CTR"
                    value={`${analytics.clickThroughRate}%`}
                    icon={<MousePointerClick className="w-4 h-4" />}
                    color="orange"
                />
                <StatCard
                    title="Conversion"
                    value={`${analytics.conversionRate}%`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    color="pink"
                />
            </div>

            {!hasShares && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
                    <Share2 className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        No Shares Yet
                    </h4>
                    <p className="text-gray-600">
                        When customers share your storefront, products, or offers, analytics will appear here.
                    </p>
                </div>
            )}

            {hasShares && (
                <>
                    {/* Share Method Breakdown */}
                    {analytics.methodBreakdown && Object.keys(analytics.methodBreakdown).length > 0 && (
                        <div className="border-t pt-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Share Methods</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(analytics.methodBreakdown).map(([method, count]) => (
                                    <MethodBadge key={method} method={method} count={count} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Shared Items */}
                    {analytics.topSharedItems && analytics.topSharedItems.length > 0 && (
                        <div className="border-t pt-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Top Shared Items</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Shares</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {analytics.topSharedItems.slice(0, 5).map((item, idx) => (
                                            <tr key={item.entityId} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                    {item.title}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${item.entityType === 'product' ? 'bg-green-100 text-green-800' :
                                                            item.entityType === 'offer' ? 'bg-orange-100 text-orange-800' :
                                                                'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {item.entityType}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                                                    {item.shares}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                                    {item.clicks}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                                    {item.ctr.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Daily Share Trend (Simple) */}
                    {analytics.dailyShares && analytics.dailyShares.length > 0 && (
                        <div className="border-t pt-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Share Trend (30 Days)</h4>
                            <div className="flex items-end gap-1 h-24 px-2">
                                {analytics.dailyShares.slice(-30).map((day, idx) => {
                                    const maxCount = Math.max(...analytics.dailyShares.map(d => d.count));
                                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                                    return (
                                        <div
                                            key={day.date}
                                            className="flex-1 bg-purple-400 rounded-t hover:bg-purple-500 transition-colors relative group"
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                            title={`${day.date}: ${day.count} shares`}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                {day.count}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                                <span>{analytics.dailyShares[0]?.date}</span>
                                <span>{analytics.dailyShares[analytics.dailyShares.length - 1]?.date}</span>
                            </div>
                        </div>
                    )}

                    {/* Recent Shares */}
                    {analytics.recentShares && analytics.recentShares.length > 0 && (
                        <div className="border-t pt-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Recent Shares</h4>
                            <div className="space-y-2">
                                {analytics.recentShares.slice(0, 5).map(share => (
                                    <div
                                        key={share.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MethodIcon method={share.method} />
                                            <div>
                                                <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${share.entityType === 'product' ? 'bg-green-100 text-green-800' :
                                                        share.entityType === 'offer' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {share.entityType}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    via {share.method.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div className="text-gray-900">{share.clicks} clicks</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(share.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Stat Card component
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'purple' | 'blue' | 'green' | 'orange' | 'pink';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    const colorClasses = {
        purple: 'bg-purple-50 text-purple-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        pink: 'bg-pink-50 text-pink-600',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-lg p-4"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">{title}</span>
                <span className={`p-1.5 rounded ${colorClasses[color]}`}>{icon}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </motion.div>
    );
}

// Method badge component
function MethodBadge({ method, count }: { method: string; count: number }) {
    return (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <MethodIcon method={method} />
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 capitalize">{method.replace('_', ' ')}</p>
                <p className="text-xs text-gray-500">{count} shares</p>
            </div>
        </div>
    );
}

// Method icon helper
function MethodIcon({ method }: { method: string }) {
    const iconClass = "w-4 h-4";
    switch (method) {
        case 'chat':
            return <MessageCircle className={`${iconClass} text-blue-500`} />;
        case 'copy_link':
            return <Copy className={`${iconClass} text-gray-500`} />;
        case 'whatsapp':
            return <MessageCircle className={`${iconClass} text-green-500`} />;
        case 'facebook':
            return <Globe className={`${iconClass} text-blue-600`} />;
        case 'twitter':
            return <Globe className={`${iconClass} text-sky-500`} />;
        case 'email':
            return <Mail className={`${iconClass} text-orange-500`} />;
        case 'native_share':
            return <ExternalLink className={`${iconClass} text-purple-500`} />;
        default:
            return <Share2 className={`${iconClass} text-gray-400`} />;
    }
}

export default BusinessShareDashboard;
