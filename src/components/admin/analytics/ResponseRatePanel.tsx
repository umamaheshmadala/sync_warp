import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponseRateData } from "@/services/adminAnalyticsService";

interface ResponseRatePanelProps {
    data?: ResponseRateData;
}

export function ResponseRatePanel({ data }: ResponseRatePanelProps) {
    if (!data) return <div>Loading...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Response Engagement</CardTitle>
                    <CardDescription>How businesses are engaging with reviews</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4 py-6">
                        <div className="relative flex items-center justify-center">
                            <svg className="h-40 w-40 transform -rotate-90">
                                <circle
                                    className="text-gray-200"
                                    strokeWidth="12"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="70"
                                    cx="80"
                                    cy="80"
                                />
                                <circle
                                    className="text-indigo-600 transition-all duration-1000 ease-in-out"
                                    strokeWidth="12"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * data.overallRate) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="70"
                                    cx="80"
                                    cy="80"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-bold">{data.overallRate}%</span>
                                <span className="text-sm text-gray-500">Response Rate</span>
                            </div>
                        </div>
                        <div className="text-center mt-4">
                            <p className="text-sm text-gray-500">Average Response Time</p>
                            <p className="text-2xl font-bold">{data.avgResponseTimeHours} hrs</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Response Rate by Category</CardTitle>
                    <CardDescription>Which business types are most engaged</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Response Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.byCategory.length > 0 ? (
                                data.byCategory.map((item) => (
                                    <TableRow key={item.category}>
                                        <TableCell className="font-medium capitalize">{item.category}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500"
                                                        style={{ width: `${item.rate}%` }}
                                                    />
                                                </div>
                                                <span className="w-8">{item.rate}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                                        No data available or all rates zero
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
