import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EngagementMetrics } from "@/services/adminAnalyticsService";
import { ThumbsUp, Share2, Eye, Award } from "lucide-react";

interface EngagementMetricsPanelProps {
    data?: EngagementMetrics;
}

export function EngagementMetricsPanel({ data }: EngagementMetricsPanelProps) {
    if (!data) return <div>Loading...</div>;

    const metrics = [
        {
            title: "Total Helpful Votes",
            value: data.totalHelpfulVotes,
            icon: ThumbsUp,
            color: "text-blue-600",
            bg: "bg-blue-100"
        },
        {
            title: "Reviews Shared",
            value: data.reviewsShared,
            icon: Share2,
            color: "text-green-600",
            bg: "bg-green-100"
        },
        {
            title: "Review Views",
            value: data.reviewViews,
            icon: Eye,
            color: "text-purple-600",
            bg: "bg-purple-100"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                {metrics.map((metric) => (
                    <Card key={metric.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {metric.title}
                            </CardTitle>
                            <div className={`${metric.bg} p-2 rounded-full`}>
                                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                *Metrics tracking coming soon
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Most Helpful Reviews
                    </CardTitle>
                    <CardDescription>Reviews with the highest engagement from community</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 text-gray-500">
                        <p>No engagement data available yet.</p>
                        <p className="text-sm mt-1">Check back after Review Interaction features are enabled.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
