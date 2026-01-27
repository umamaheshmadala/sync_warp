import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, MessageSquare, Clock } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useBusinessReviewAnalytics, useDailyReviewStats, useTagAnalysis, useReviewTimeHeatmap } from '@/hooks/useReviewAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeStatusCard } from '@/components/business/BadgeStatusCard';

interface ReviewAnalyticsDashboardProps {
    businessId: string;
}

export default function ReviewAnalyticsDashboard({ businessId }: ReviewAnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState<7 | 30 | 90 | 365>(30);

    const { data: analytics, isLoading: analyticsLoading } = useBusinessReviewAnalytics(businessId, timeRange);
    const { data: dailyStats, isLoading: statsLoading } = useDailyReviewStats(businessId, timeRange);
    const { data: tagData, isLoading: tagsLoading } = useTagAnalysis(businessId);

    if (analyticsLoading || statsLoading || tagsLoading || !analytics || !tagData) {
        return <DashboardSkeleton />;
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    {[7, 30, 90, 365].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as 7 | 30 | 90 | 365)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${timeRange === range
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {range === 365 ? '1 Year' : `${range} Days`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Badge Status */}
            <BadgeStatusCard businessId={businessId} />

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Recommendation Rate */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Recommendation Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold">{analytics.recommendationRate.toFixed(0)}%</span>
                            <TrendIndicator trend={analytics.trend} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {analytics.trend === 'improving'
                                ? `+${(analytics.recommendationRate - analytics.previousRate).toFixed(1)}% vs previous`
                                : analytics.trend === 'declining'
                                    ? `${(analytics.recommendationRate - analytics.previousRate).toFixed(1)}% vs previous`
                                    : 'Same as previous period'}
                        </p>
                    </CardContent>
                </Card>

                {/* Response Rate */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Response Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold">{analytics.responseRate.toFixed(0)}%</span>
                        {analytics.unrepliedCount > 0 && (
                            <p className="text-xs text-orange-600 font-medium mt-1">
                                {analytics.unrepliedCount} reviews need response
                            </p>
                        )}
                        {analytics.unrepliedCount === 0 && (
                            <p className="text-xs text-green-600 mt-1">All reviews replied!</p>
                        )}
                    </CardContent>
                </Card>

                {/* Avg Response Time */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Avg Response Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold">
                            {analytics.avgResponseHours < 1 ? '< 1h' :
                                analytics.avgResponseHours < 24
                                    ? `${analytics.avgResponseHours.toFixed(0)}h`
                                    : `${(analytics.avgResponseHours / 24).toFixed(1)}d`}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">Target: &lt; 24h</p>
                    </CardContent>
                </Card>

                {/* Total Reviews */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Reviews
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold">
                            {dailyStats ? dailyStats.reduce((sum, d) => sum + d.reviewCount, 0) : 0}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">in last {timeRange} days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Review Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyStats || []}>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    labelFormatter={(value) => formatDate(value as string)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="recommendCount" stackId="a" fill="#22c55e" name="Recommend" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="notRecommendCount" stackId="a" fill="#ef4444" name="Don't Recommend" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recommendation Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recommendation Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyStats || []}>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    labelFormatter={(value) => formatDate(value as string)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="recommendationRate"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="% Recommend"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Tag Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What Customers Say</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Positive Tags */}
                        <div>
                            <h4 className="font-medium text-green-600 mb-4 flex items-center gap-2">
                                <span className="bg-green-100 p-1 rounded">👍</span> Most Praised
                            </h4>
                            <div className="space-y-4">
                                {tagData.positive.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No positive tags yet.</p>
                                ) : (
                                    tagData.positive.map(tag => (
                                        <div key={tag.tag} className="group">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-700">{tag.tag}</span>
                                                <span className="text-gray-500">{tag.count} reviews</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${(tag.count / tagData.positive[0].count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Negative Tags */}
                        <div>
                            <h4 className="font-medium text-red-600 mb-4 flex items-center gap-2">
                                <span className="bg-red-100 p-1 rounded">👎</span> Needs Improvement
                            </h4>
                            <div className="space-y-4">
                                {tagData.negative.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No negative tags yet.</p>
                                ) : (
                                    tagData.negative.map(tag => (
                                        <div key={tag.tag} className="group">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-700">{tag.tag}</span>
                                                <span className="text-gray-500">{tag.count} reviews</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500 rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${(tag.count / (tagData.negative[0]?.count || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Peak Review Times Heatmap */}
            <PeakTimesHeatmap businessId={businessId} />
        </div>
    );
}

function PeakTimesHeatmap({ businessId }: { businessId: string }) {
    const { data: heatmapData, isLoading } = useReviewTimeHeatmap(businessId);

    if (isLoading || !heatmapData) return null;

    // Helper to get opacity based on review count (max 10 for full opacity)
    const getOpacity = (count: number) => {
        if (count === 0) return 0.05;
        return Math.min(0.2 + (count / 5) * 0.8, 1);
    };

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 12 }, (_, i) => i * 2); // Every 2 hours for labels

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Peak Review Times (Last Year)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto pb-2">
                    <div className="min-w-[600px]">
                        {/* Hour Labels */}
                        <div className="flex mb-2 pl-12">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="flex-1 text-[10px] text-gray-400 text-center">
                                    {i % 3 === 0 ? i : ''}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="space-y-1">
                            {days.map((day, dayIndex) => (
                                <div key={day} className="flex items-center">
                                    <div className="w-12 text-xs font-medium text-gray-500">{day}</div>
                                    <div className="flex-1 flex gap-[2px]">
                                        {Array.from({ length: 24 }).map((_, hourIndex) => {
                                            const cell = heatmapData.find(d => d.dayOfWeek === dayIndex && d.hourOfDay === hourIndex);
                                            const count = cell?.reviewCount || 0;
                                            return (
                                                <div
                                                    key={hourIndex}
                                                    className={`h-6 flex-1 rounded-sm transition-all hover:ring-2 hover:ring-indigo-400 relative group`}
                                                    style={{
                                                        backgroundColor: `rgb(79, 70, 229, ${getOpacity(count)})` // Indigo-600 base
                                                    }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                                        {count} reviews at {hourIndex}:00
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-end text-xs text-gray-500 gap-2">
                            <span>Less</span>
                            <div className="w-3 h-3 bg-indigo-600/5 rounded-sm"></div>
                            <div className="w-3 h-3 bg-indigo-600/40 rounded-sm"></div>
                            <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
    if (trend === 'improving') {
        return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
    if (trend === 'declining') {
        return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    return <Minus className="w-5 h-5 text-gray-400" />;
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-72 w-full rounded-xl" />
                <Skeleton className="h-72 w-full rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );
}
