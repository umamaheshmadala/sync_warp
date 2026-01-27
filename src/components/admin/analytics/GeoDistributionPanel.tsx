import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GeoData } from "@/services/adminAnalyticsService";
import { MapPin } from "lucide-react";

interface GeoDistributionPanelProps {
    data?: GeoData;
}

export function GeoDistributionPanel({ data }: GeoDistributionPanelProps) {
    if (!data) return <div>Loading...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Geographic Reach</CardTitle>
                    <CardDescription>Where reviews are coming from</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                        <MapPin className="w-12 h-12 mb-2 opacity-20" />
                        <p>Map visualization coming soon</p>
                        <p className="text-xs">Requires mapping integration</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Reviews by City</CardTitle>
                    <CardDescription>Top locations for review activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>City</TableHead>
                                <TableHead className="text-right">Review Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.byCity.length > 0 ? (
                                data.byCity.map((item) => (
                                    <TableRow key={item.city}>
                                        <TableCell className="font-medium">{item.city || 'Unknown'}</TableCell>
                                        <TableCell className="text-right">{item.count}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                                        No location data found
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
