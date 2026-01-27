import { FraudMetrics } from '@/services/adminAnalyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, AlertTriangle, UserX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FraudMetricsPanelProps {
    data?: FraudMetrics;
}

export function FraudMetricsPanel({ data }: FraudMetricsPanelProps) {
    if (!data) return <div className="p-8 text-center text-gray-400">Loading fraud metrics...</div>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-red-50 border-red-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-600">Total Flagged</span>
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="text-2xl font-bold text-red-900">{data.totalFlagged}</div>
                        <p className="text-xs text-red-700 mt-1">{data.flaggedPercentage}% of all reviews</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">False Positive Rate</span>
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="text-2xl font-bold">{data.falsePositiveRate}%</div>
                        <p className="text-xs text-gray-500 mt-1">Flagged but approved</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">High Risk Users</span>
                            <UserX className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold">{data.topFlaggedUsers.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Multiple flags triggered</p>
                    </CardContent>
                </Card>
            </div>

            {/* Signal Distribution Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Fraud Signals by Type</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {data.bySignalType.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.bySignalType} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="type"
                                    type="category"
                                    width={120}
                                    tickFormatter={(val) => val.replace(/_/g, ' ')}
                                    className="text-xs capitalize"
                                />
                                <Tooltip />
                                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={32}>
                                    {data.bySignalType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ef4444' : '#f87171'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No fraud signals detected yet</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
