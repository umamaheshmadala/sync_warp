import React from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, MoreHorizontal, Eye, CheckCircle, XCircle, Trash2, RefreshCcw, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BusinessStatusBadge } from './BusinessStatusBadge';
import { AdminBusinessView } from '@/services/adminBusinessService';
import { format } from 'date-fns';

interface BusinessListTableProps {
    businesses: AdminBusinessView[];
    isLoading: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSort: (column: string) => void;
    onRefresh: () => void;
    onView: (id: string) => void;
    onApprove: (business: AdminBusinessView) => void;
    onReject: (business: AdminBusinessView) => void;
    onEdit: (business: AdminBusinessView) => void;
    onSoftDelete: (business: AdminBusinessView) => void;
    onRestore: (business: AdminBusinessView) => void;
    onHardDelete: (business: AdminBusinessView) => void;
}

export function BusinessListTable({
    businesses,
    isLoading,
    sortBy,
    sortOrder,
    onSort,
    onRefresh,
    onView,
    onApprove,
    onReject,
    onEdit,
    onSoftDelete,
    onRestore,
    onHardDelete
}: BusinessListTableProps) {

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return <ArrowUpDown className="ml-2 h-3 w-3 text-gray-400" />;
        return <ArrowUpDown className={`ml-2 h-3 w-3 ${sortOrder === 'asc' ? 'text-gray-900 rotate-180' : 'text-gray-900'}`} />;
    };

    const TableHeaderCell = ({ column, label }: { column: string, label: string }) => (
        <TableHead
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onSort(column)}
        >
            <div className="flex items-center">
                {label}
                <SortIcon column={column} />
            </div>
        </TableHead>
    );

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Business Name</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableHeaderCell column="business_name" label="Business Name" />
                        <TableHead>Owner</TableHead>
                        <TableHeaderCell column="city" label="City" />
                        <TableHead>Category</TableHead>
                        <TableHeaderCell column="status" label="Status" />
                        <TableHeaderCell column="created_at" label="Registered" />
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {businesses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                No businesses found matching your criteria.
                            </TableCell>
                        </TableRow>
                    ) : (
                        businesses.map((business) => (
                            <TableRow key={business.id} className="hover:bg-gray-50/50">
                                <TableCell className="font-medium">
                                    <div
                                        className="flex flex-col cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={(e) => {
                                            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                                                // Let default behavior happen if we wrapped in <a>, but since it's a div, we need to manually open
                                                // Actually, best practice is to just window.open
                                                const url = new URL(window.location.href);
                                                url.searchParams.set('businessId', business.id);
                                                window.open(url.toString(), '_blank');
                                            } else {
                                                onView(business.id);
                                            }
                                        }}
                                        onAuxClick={(e) => {
                                            // Handle middle click
                                            if (e.button === 1) {
                                                const url = new URL(window.location.href);
                                                url.searchParams.set('businessId', business.id);
                                                window.open(url.toString(), '_blank');
                                            }
                                        }}
                                    >
                                        <span className="text-sm font-semibold text-gray-900 line-clamp-1">
                                            {business.business_name}
                                        </span>
                                        <span className="text-xs text-gray-500 line-clamp-1">
                                            {business.business_email || business.business_phone}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-900">{business.owner.full_name || 'Unknown'}</span>
                                        <span className="text-xs text-gray-400">{business.owner.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm">{business.city || 'N/A'}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {business.categories && business.categories.length > 0 ? (
                                            business.categories.slice(0, 2).map((cat, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                    {cat}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                        )}
                                        {business.categories && business.categories.length > 2 && (
                                            <span className="text-xs text-gray-400">+{business.categories.length - 2}</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 block mt-1">{business.business_type}</span>
                                </TableCell>
                                <TableCell>
                                    <BusinessStatusBadge status={business.status} />
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {format(new Date(business.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[160px]">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                                                        e.preventDefault(); // Prevent dropdown from just closing without action if needed, though menu usually closes.
                                                        const url = new URL(window.location.href);
                                                        url.searchParams.set('businessId', business.id);
                                                        window.open(url.toString(), '_blank');
                                                    } else {
                                                        onView(business.id);
                                                    }
                                                }}
                                            >
                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                            </DropdownMenuItem>

                                            {business.status !== 'deleted' && (
                                                <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(business)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuSeparator />
                                            {business.status === 'pending' && (
                                                <>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer text-green-600 focus:text-green-700 focus:bg-green-50"
                                                        onClick={() => onApprove(business)}
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                                        onClick={() => onReject(business)}
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" /> Reject
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {business.status === 'deleted' ? (
                                                <>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                                                        onClick={() => onRestore(business)}
                                                    >
                                                        <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer text-red-700 focus:text-red-800 focus:bg-red-50"
                                                        onClick={() => onHardDelete(business)}
                                                    >
                                                        <AlertTriangle className="mr-2 h-4 w-4" /> Hard Delete
                                                    </DropdownMenuItem>
                                                </>
                                            ) : (
                                                <DropdownMenuItem
                                                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                                    onClick={() => onSoftDelete(business)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
