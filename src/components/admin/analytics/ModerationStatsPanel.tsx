import { ModerationStats } from '@/services/adminAnalyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ModerationStatsPanelProps {
    data?: ModerationStats;
}

export function ModerationStatsPanel({ data }: ModerationStatsPanelProps) {
    if (!data) return <div className="text-center p-8 text-gray-400">Loading moderation stats...</div>;

    const pieData = [
        { name: 'Approved', value: data.approvedCount, color: '#22c55e' },
        { name: 'Rejected', value: data.rejectedCount, color: '#ef4444' }
    ];

    const hasData = data.approvedCount > 0 || data.rejectedCount > 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Approval Split Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Approval vs Rejection</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No moderation data yet</div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-6">
                {/* Rejection Reasons */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top Rejection Reasons</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.rejectionReasons.length === 0 ? (
                                <p className="text-sm text-gray-400">No rejections recorded yet.</p>
                            ) : (
                                data.rejectionReasons.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="capitalize">{item.reason.replace(/_/g, ' ')}</span>
                                        <span className="font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                            {item.count}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Moderator Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Moderator Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.moderatorStats.map((mod, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                            {mod.name.charAt(0)}
                                        </div>
                                        <span>{mod.name}</span>
                                    </div>
                                    <span className="font-bold">{mod.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
