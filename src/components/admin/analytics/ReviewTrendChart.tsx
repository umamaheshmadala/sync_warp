import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendDataPoint } from '@/services/adminAnalyticsService';

interface ReviewTrendChartProps {
    data: TrendDataPoint[];
}

export function ReviewTrendChart({ data }: ReviewTrendChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-gray-400">No trend data available</div>;
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="total"
                        name="Total Reviews"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="approved"
                        name="Approved"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="rejected"
                        name="Rejected"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
