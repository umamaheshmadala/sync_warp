import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { HardDeletedBusiness } from '@/services/adminBusinessService';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface HardDeletedBusinessTableProps {
    businesses: HardDeletedBusiness[];
    isLoading: boolean;
}

export function HardDeletedBusinessTable({ businesses, isLoading }: HardDeletedBusinessTableProps) {
    if (isLoading) {
        return (
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="w-[200px]">Business Name</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Deleted At</TableHead>
                            <TableHead>Deleted By</TableHead>
                            <TableHead className="w-[250px]">Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(6)].map((_, j) => (
                                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (businesses.length === 0) {
        return (
            <div className="rounded-md border bg-white p-12 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Permanently Deleted Businesses</h3>
                <p className="text-gray-500">
                    Businesses that have been permanently deleted will appear here.
                    <br />
                    <span className="text-sm text-red-500 mt-2 inline-block">
                        Note: Permanently deleted businesses cannot be recovered.
                    </span>
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-800">
                    These businesses have been permanently deleted and cannot be recovered.
                </span>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50">
                        <TableHead className="w-[200px]">Business Name</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Deleted By</TableHead>
                        <TableHead className="w-[250px]">Reason</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {businesses.map((business) => (
                        <TableRow key={business.id} className="hover:bg-gray-50">
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge variant="destructive" className="text-xs">Deleted</Badge>
                                    <span className="font-medium text-gray-900 line-through">
                                        {business.business_name}
                                    </span>
                                </div>
                                {business.business_type && (
                                    <span className="text-xs text-gray-500">{business.business_type}</span>
                                )}
                            </TableCell>
                            <TableCell className="text-gray-600">{business.city || '-'}</TableCell>
                            <TableCell>
                                <div className="text-sm">
                                    <div className="text-gray-900">{business.owner_name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{business.owner_email || ''}</div>
                                </div>
                            </TableCell>
                            <TableCell className="text-gray-600">
                                {format(new Date(business.deleted_at), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                            <TableCell className="text-gray-600">{business.deleted_by}</TableCell>
                            <TableCell>
                                <span className="text-sm text-gray-600 line-clamp-2" title={business.reason}>
                                    {business.reason || 'No reason provided'}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
