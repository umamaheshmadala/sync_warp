import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AdminAuditLogEntry } from "@/services/adminBusinessService";
import { ChangesDiffViewer } from "./ChangesDiffViewer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Trash2, Edit, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface AuditLogTableProps {
    logs: AdminAuditLogEntry[];
    loading: boolean;
    sortConfig?: { key: string; direction: 'asc' | 'desc' };
    onSort?: (key: string) => void;
}

export function AuditLogTable({ logs, loading, sortConfig, onSort }: AuditLogTableProps) {
    if (loading) {
        return (
            <div className="w-full bg-white rounded-lg shadow-sm p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="w-full bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                <p className="text-lg font-medium">No audit logs found</p>
                <p className="text-sm">Try adjusting your filters</p>
            </div>
        );
    }

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'approve':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none flex w-fit items-center gap-1"><CheckCircle size={12} /> Approved</Badge>;
            case 'reject':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none flex w-fit items-center gap-1"><AlertCircle size={12} /> Rejected</Badge>;
            case 'edit':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none flex w-fit items-center gap-1"><Edit size={12} /> Edited</Badge>;
            case 'soft_delete':
            case 'delete':
                return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none flex w-fit items-center gap-1"><Trash2 size={12} /> Soft Deleted</Badge>;
            case 'hard_delete':
                return <Badge className="bg-red-900 text-white hover:bg-red-800 border-none flex w-fit items-center gap-1"><Trash2 size={12} /> Hard Deleted</Badge>;
            case 'restore':
                return <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-none flex w-fit items-center gap-1"><RotateCcw size={12} /> Restored</Badge>;
            default:
                return <Badge variant="outline" className="capitalize">{action}</Badge>;
        }
    };

    const renderSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4 text-indigo-600" />
            : <ArrowDown className="ml-2 h-4 w-4 text-indigo-600" />;
    };

    const SortableHead = ({ label, sortKey, className }: { label: string, sortKey?: string, className?: string }) => (
        <TableHead
            className={`${className} ${sortKey && onSort ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
            onClick={() => sortKey && onSort && onSort(sortKey)}
        >
            <div className="flex items-center">
                {label}
                {sortKey && renderSortIcon(sortKey)}
            </div>
        </TableHead>
    );

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <SortableHead label="Date & Time" sortKey="created_at" className="w-[180px]" />
                        <SortableHead label="Admin" sortKey="admin" />
                        <SortableHead label="Action" sortKey="action" />
                        <SortableHead label="Business" sortKey="business" />
                        <TableHead className="w-[30%]">Details / Changes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gray-50/50">
                            <TableCell className="text-gray-600 font-medium whitespace-nowrap align-top">
                                {format(new Date(log.created_at), "MMM d, yyyy")}
                                <div className="text-xs text-gray-400 font-normal">
                                    {format(new Date(log.created_at), "h:mm a")}
                                </div>
                            </TableCell>
                            <TableCell className="align-top">
                                <div className="font-medium text-gray-900">{log.admin.full_name}</div>
                                <div className="text-xs text-gray-400">{log.admin.email}</div>
                            </TableCell>
                            <TableCell className="align-top">
                                {getActionBadge(log.action)}
                            </TableCell>
                            <TableCell className="align-top">
                                <div className="font-medium text-gray-800">
                                    {log.business?.business_name || <span className="text-gray-400 italic">Unknown / Deleted</span>}
                                </div>
                            </TableCell>
                            <TableCell className="align-top">
                                {log.reason && (
                                    <div className="text-sm text-gray-600 mb-2">
                                        <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">Reason:</span> {log.reason}
                                    </div>
                                )}
                                {log.changes_json && Object.keys(log.changes_json).length > 0 && (
                                    <ChangesDiffViewer changes={log.changes_json} />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
