import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TopBusinessData } from '@/services/adminAnalyticsService';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopBusinessesTableProps {
    data: TopBusinessData[];
}

export function TopBusinessesTable({ data }: TopBusinessesTableProps) {
    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-gray-400">No data available</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Approved Reviews</TableHead>
                        <TableHead className="text-right">Rec. Rate</TableHead>
                        <TableHead className="text-center">Fraud Flags</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((biz) => (
                        <TableRow key={biz.id}>
                            <TableCell className="font-medium">{biz.name}</TableCell>
                            <TableCell className="text-muted-foreground">{biz.category}</TableCell>
                            <TableCell className="text-right font-bold">{biz.reviewCount}</TableCell>
                            <TableCell className="text-right">
                                <span className={biz.recommendationRate >= 90 ? 'text-green-600 font-medium' : ''}>
                                    {biz.recommendationRate}%
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                {biz.fraudFlags > 0 ? (
                                    <Badge variant="destructive" className="gap-1 inline-flex">
                                        <AlertTriangle className="w-3 h-3" />
                                        {biz.fraudFlags}
                                    </Badge>
                                ) : (
                                    <span className="text-gray-300">-</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Link to={`/business/${biz.id}`} target="_blank">
                                    <ExternalLink className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
