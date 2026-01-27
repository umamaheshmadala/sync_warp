import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OverviewMetrics } from '@/services/adminAnalyticsService';
import { TrendingUp, MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface OverviewCardsProps {
    data?: OverviewMetrics;
}

export function OverviewCards({ data }: OverviewCardsProps) {
    if (!data) return <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse h-32 bg-gray-100 rounded-lg"></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reviews Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.totalReviews}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {data.weekOverWeekChange > 0 ? '+' : ''}{data.weekOverWeekChange}% from last week
                        {data.weekOverWeekChange > 0 ? <TrendingUp className="w-3 h-3 text-green-500" /> : null}
                    </p>
                </CardContent>
            </Card>

            {/* Pending Moderation Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Moderation</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.pendingModeration}</div>
                    <p className="text-xs text-muted-foreground">
                        Awaiting action
                    </p>
                </CardContent>
            </Card>

            {/* Approval Rate Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.approvalRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {100 - data.approvalRate}% rejected
                    </p>
                </CardContent>
            </Card>

            {/* Fraud Alerts Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Fraud Alerts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.activeFraudAlerts}</div>
                    <p className="text-xs text-muted-foreground">
                        In the last 7 days
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
