/**
 * Admin Business Edits Page
 * 
 * Centralized view for:
 * 1. Pending Edits Queue - Business profile changes awaiting admin review
 * 2. Activity Logs - Comprehensive history of all business editing activity
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    PenSquare,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Zap,
    Package,
    Tag,
    FileText,
    ChevronDown,
    ChevronUp,
    Filter,
    Search,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminPendingEditsService, PendingEditSummary } from '../../services/adminPendingEditsService';
import {
    getActivityLogs,
    ActivityLogEntry,
    ActivityLogFilters,
    getActionTypeDisplay,
    ActivityActionType
} from '../../services/businessActivityLogService';
import { PendingEditsReviewModal } from '../../components/admin/business-management/PendingEditsReviewModal';

// Action type options for filter dropdown
const ACTION_TYPE_OPTIONS: { value: ActivityActionType; label: string }[] = [
    { value: 'business_registered', label: 'Business Registered' },
    { value: 'business_approved', label: 'Business Approved' },
    { value: 'business_rejected', label: 'Business Rejected' },
    { value: 'edit_submitted', label: 'Edit Submitted' },
    { value: 'edit_approved', label: 'Edit Approved' },
    { value: 'edit_rejected', label: 'Edit Rejected' },
    { value: 'edit_partial', label: 'Partial Approval' },
    { value: 'edit_auto_approved', label: 'Auto-Approved' },
    { value: 'product_created', label: 'Product Created' },
    { value: 'product_updated', label: 'Product Updated' },
    { value: 'product_deleted', label: 'Product Deleted' },
    { value: 'offer_created', label: 'Offer Created' },
    { value: 'offer_updated', label: 'Offer Updated' },
    { value: 'offer_activated', label: 'Offer Activated' },
    { value: 'offer_paused', label: 'Offer Paused' },
    { value: 'offer_terminated', label: 'Offer Terminated' },
];

export default function AdminBusinessEditsPage() {
    const navigate = useNavigate();
    const [selectedEdit, setSelectedEdit] = useState<PendingEditSummary | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ActivityLogFilters>({});

    // Fetch pending edits
    const {
        data: pendingEdits,
        isLoading: pendingLoading,
        refetch: refetchPending
    } = useQuery({
        queryKey: ['admin-pending-edits'],
        queryFn: () => adminPendingEditsService.getPendingEditsList()
    });

    // Fetch activity logs
    const {
        data: activityData,
        isLoading: logsLoading,
        refetch: refetchLogs
    } = useQuery({
        queryKey: ['admin-activity-logs', filters, page],
        queryFn: () => getActivityLogs(filters, page, 20)
    });

    const handleReviewComplete = () => {
        setSelectedEdit(null);
        refetchPending();
        refetchLogs();
    };

    const getActionIcon = (actionType: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            'business_registered': <FileText size={16} className="text-blue-500" />,
            'business_approved': <CheckCircle size={16} className="text-green-500" />,
            'business_rejected': <XCircle size={16} className="text-red-500" />,
            'edit_submitted': <Clock size={16} className="text-yellow-500" />,
            'edit_approved': <CheckCircle size={16} className="text-green-500" />,
            'edit_rejected': <XCircle size={16} className="text-red-500" />,
            'edit_partial': <AlertCircle size={16} className="text-orange-500" />,
            'edit_auto_approved': <Zap size={16} className="text-purple-500" />,
            'product_created': <Package size={16} className="text-blue-500" />,
            'product_updated': <Package size={16} className="text-blue-500" />,
            'product_deleted': <Package size={16} className="text-red-500" />,
            'offer_created': <Tag size={16} className="text-blue-500" />,
            'offer_updated': <Tag size={16} className="text-blue-500" />,
            'offer_activated': <Tag size={16} className="text-green-500" />,
            'offer_paused': <Tag size={16} className="text-yellow-500" />,
            'offer_terminated': <Tag size={16} className="text-red-500" />,
        };
        return iconMap[actionType] || <FileText size={16} className="text-gray-400" />;
    };

    const formatFieldChanges = (fieldChanges: Record<string, any>) => {
        if (!fieldChanges || Object.keys(fieldChanges).length === 0) return null;
        return (
            <div className="mt-2 space-y-1 text-xs">
                {Object.entries(fieldChanges).map(([field, change]: [string, any]) => (
                    <div key={field} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                        <span className="font-medium text-gray-600 min-w-[100px]">{field}:</span>
                        <div className="flex-1">
                            {change.old !== null && (
                                <span className="text-red-600 line-through mr-2">{String(change.old)}</span>
                            )}
                            <span className="text-green-600">{String(change.new)}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-w-0 max-w-full px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <PenSquare className="text-indigo-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-900">Business Edits</h1>
                </div>
                <p className="text-gray-500">Review pending changes and view complete editing activity history.</p>
            </div>

            {/* Pending Edits Queue */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Clock size={20} className="text-yellow-500" />
                        Pending Edits Queue
                        {pendingEdits && pendingEdits.length > 0 && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                {pendingEdits.length}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => refetchPending()}
                        className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                    {pendingLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading pending edits...</div>
                    ) : !pendingEdits || pendingEdits.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                            <p>No pending edits to review</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="text-left px-4 py-3">Business</th>
                                    <th className="text-left px-4 py-3">Owner</th>
                                    <th className="text-left px-4 py-3">Submitted</th>
                                    <th className="text-left px-4 py-3">Changes</th>
                                    <th className="text-left px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pendingEdits.map((edit) => (
                                    <tr key={edit.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{edit.business_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{edit.owner_name}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {format(new Date(edit.submitted_at), 'MMM d, h:mm a')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                                                {edit.change_count} field{edit.change_count !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedEdit(edit)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                Review →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Activity Logs */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <FileText size={20} className="text-indigo-500" />
                        Activity Logs
                        {activityData && (
                            <span className="text-sm font-normal text-gray-500">
                                ({activityData.total} total)
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'
                                }`}
                        >
                            <Filter size={14} />
                            Filters
                        </button>
                        <button
                            onClick={() => refetchLogs()}
                            className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={filters.searchTerm || ''}
                                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value || undefined })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
                                <select
                                    value={filters.actionType || ''}
                                    onChange={(e) => setFilters({ ...filters, actionType: e.target.value as ActivityActionType || undefined })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">All Actions</option>
                                    {ACTION_TYPE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Actor Type</label>
                                <select
                                    value={filters.actorType || ''}
                                    onChange={(e) => setFilters({ ...filters, actorType: e.target.value as any || undefined })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">All Actors</option>
                                    <option value="owner">Owner</option>
                                    <option value="admin">Admin</option>
                                    <option value="system">System</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.startDate || ''}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filters.endDate || ''}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={() => { setFilters({}); setPage(1); }}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Logs Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                    {logsLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading activity logs...</div>
                    ) : !activityData || activityData.data.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                            <p>No activity logs found</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y">
                                {activityData.data.map((log) => {
                                    const display = getActionTypeDisplay(log.action_type as ActivityActionType);
                                    const isExpanded = expandedLog === log.id;
                                    const hasDetails =
                                        (log.field_changes && Object.keys(log.field_changes).length > 0) ||
                                        log.metadata?.reason ||
                                        log.metadata?.fields ||
                                        (log.metadata?.updates && log.metadata.updates.length > 0);

                                    return (
                                        <div key={log.id} className="hover:bg-gray-50">
                                            <div
                                                className="px-4 py-3 flex items-center gap-4 cursor-pointer"
                                                onClick={() => hasDetails && setExpandedLog(isExpanded ? null : log.id)}
                                            >
                                                <div className="flex-shrink-0">
                                                    {getActionIcon(log.action_type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 truncate">
                                                            {log.business?.business_name || 'Unknown Business'}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/admin/businesses?id=${log.business_id}`);
                                                            }}
                                                            className="text-gray-400 hover:text-indigo-600"
                                                        >
                                                            <ExternalLink size={12} />
                                                        </button>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {log.action_type === 'product_created' ? (
                                                            <span>
                                                                {display.label}: <span className="font-semibold text-gray-900">{log.metadata?.name || 'Product'}</span>
                                                            </span>
                                                        ) : log.action_type === 'product_updated' ? (
                                                            <span>
                                                                {log.metadata?.action === 'archived' ? 'Archived' :
                                                                    log.metadata?.action === 'unarchived' ? 'Unarchived' :
                                                                        'Updated'} product: <span className="font-semibold text-gray-900">{log.metadata?.name || 'Product'}</span>
                                                            </span>
                                                        ) : (
                                                            display.label
                                                        )}
                                                        {log.actor_type !== 'system' && log.actor_id && (
                                                            <span className="ml-2 text-gray-400">
                                                                by {log.actor_type === 'admin' ? 'Admin' : 'Owner'}
                                                            </span>
                                                        )}
                                                        {log.actor_type === 'system' && (
                                                            <span className="ml-2 text-purple-500">• Auto</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400 text-right flex-shrink-0">
                                                    <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                                                    <div>{format(new Date(log.created_at), 'h:mm:ss a')}</div>
                                                </div>
                                                {hasDetails && (
                                                    <div className="flex-shrink-0 text-gray-400">
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                )}
                                            </div>
                                            {isExpanded && hasDetails && (
                                                <div className="px-4 pb-3 pl-12">
                                                    {formatFieldChanges(log.field_changes)}
                                                    {log.metadata?.updates && Array.isArray(log.metadata.updates) && log.metadata.updates.length > 0 && (
                                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs">
                                                            <span className="text-blue-800 font-medium">Updates: </span>
                                                            <span className="text-blue-600">
                                                                {log.metadata.updates.map((f: string) => f.replace(/_/g, ' ')).join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {log.metadata?.reason && (
                                                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                                            <strong>Reason:</strong> {log.metadata.reason}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {activityData.total > 20 && (
                                <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">
                                        Page {page} of {Math.ceil(activityData.total / 20)}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page * 20 >= activityData.total}
                                            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Review Modal */}
            {selectedEdit && (
                <PendingEditsReviewModal
                    businessId={selectedEdit.business_id}
                    isOpen={true}
                    onClose={() => setSelectedEdit(null)}
                    onComplete={handleReviewComplete}
                />
            )}
        </div>
    );
}
