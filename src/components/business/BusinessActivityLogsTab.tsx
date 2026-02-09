/**
 * Business Activity Logs Tab
 * 
 * Owner-facing view of all business activities and changes.
 * Shows complete, permanent history including:
 * - Business registration
 * - Profile updates (pending, approved, rejected, auto-approved)
 * - Offer lifecycle
 * - Product changes
 * - Admin actions
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Zap,
    Package,
    Tag,
    Image,
    ChevronDown,
    ChevronUp,
    History,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getBusinessActivityLogs, ActivityLogEntry, getActionTypeDisplay, ActivityActionType } from '../../services/businessActivityLogService';

interface BusinessActivityLogsTabProps {
    businessId: string;
}

export function BusinessActivityLogsTab({ businessId }: BusinessActivityLogsTabProps) {
    const [expandedLog, setExpandedLog] = React.useState<string | null>(null);

    const { data: logs, isLoading, error, refetch } = useQuery({
        queryKey: ['business-activity-logs', businessId],
        queryFn: () => getBusinessActivityLogs(businessId, 100),
        enabled: !!businessId,
        refetchInterval: 5000 // Poll every 5 seconds to ensure freshness
    });

    // Realtime subscription for auto-updates
    React.useEffect(() => {
        if (!businessId) return;

        console.log('Setting up activity log subscription for:', businessId);

        const channel = supabase
            .channel(`activity-logs-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'business_activity_log',
                    filter: `business_id=eq.${businessId}`
                },
                (payload) => {
                    console.log('Realtime activity log update:', payload);
                    refetch();
                }
            )
            .subscribe((status) => {
                console.log('Activity log subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [businessId, refetch]);

    const getActionIcon = (actionType: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            'business_registered': <FileText size={18} className="text-blue-500" />,
            'business_approved': <CheckCircle size={18} className="text-green-500" />,
            'business_rejected': <XCircle size={18} className="text-red-500" />,
            'edit_submitted': <Clock size={18} className="text-yellow-500" />,
            'edit_approved': <CheckCircle size={18} className="text-green-500" />,
            'edit_rejected': <XCircle size={18} className="text-red-500" />,
            'edit_partial': <AlertCircle size={18} className="text-orange-500" />,
            'edit_auto_approved': <Zap size={18} className="text-purple-500" />,
            'product_created': <Package size={18} className="text-blue-500" />,
            'product_updated': <Package size={18} className="text-blue-500" />,
            'product_deleted': <Package size={18} className="text-red-500" />,
            'offer_created': <Tag size={18} className="text-blue-500" />,
            'offer_updated': <Tag size={18} className="text-blue-500" />,
            'offer_activated': <Tag size={18} className="text-green-500" />,
            'offer_paused': <Tag size={18} className="text-yellow-500" />,
            'offer_terminated': <Tag size={18} className="text-red-500" />,
            'hours_updated': <Clock size={18} className="text-blue-500" />,
            'media_uploaded': <Image size={18} className="text-blue-500" />,
            'media_deleted': <Image size={18} className="text-red-500" />,
        };
        return iconMap[actionType] || <FileText size={18} className="text-gray-400" />;
    };

    const getActionDescription = (log: ActivityLogEntry): React.ReactNode => {
        const display = getActionTypeDisplay(log.action_type as ActivityActionType);

        if (log.action_type === 'product_created') {
            return (
                <span>
                    Created product <span className="font-semibold text-gray-900">{log.metadata?.name || 'Product'}</span>
                </span>
            );
        }

        if (log.action_type.startsWith('offer_')) {
            const offerTitle = log.metadata?.name || 'Offer';
            const auditCode = log.metadata?.audit_code;

            return (
                <span>
                    {display.label} <span className="font-semibold text-gray-900">{offerTitle}</span>
                    {auditCode && <span className="text-gray-500 font-normal ml-1">(Audit: {auditCode})</span>}
                </span>
            );
        }
        if (log.action_type === 'product_updated') {
            const productName = log.metadata?.name || 'Product';
            if (log.metadata?.action === 'archived') {
                return (
                    <span>
                        Archived product <span className="font-semibold text-gray-900">{productName}</span>
                    </span>
                );
            }
            if (log.metadata?.action === 'unarchived') {
                return (
                    <span>
                        Unarchived product <span className="font-semibold text-gray-900">{productName}</span>
                    </span>
                );
            }
            return (
                <span>
                    Updated product <span className="font-semibold text-gray-900">{productName}</span>
                </span>
            );
        }

        if (log.action_type === 'product_deleted') {
            return (
                <span>
                    Deleted product <span className="font-semibold text-gray-900">{log.metadata?.name || 'Product'}</span>
                </span>
            );
        }

        if (log.actor_type === 'admin') {
            return `${display.label} by Admin`;
        } else if (log.actor_type === 'system') {
            return `${display.label} (Automatic)`;
        }
        return display.label;
    };

    const formatFieldChanges = (fieldChanges: Record<string, any>) => {
        if (!fieldChanges || Object.keys(fieldChanges).length === 0) return null;
        return (
            <div className="mt-3 space-y-2">
                {Object.entries(fieldChanges).map(([field, change]: [string, any]) => (
                    <div key={field} className="flex items-start gap-2 bg-gray-50 p-2 rounded text-sm">
                        <span className="font-medium text-gray-600 min-w-[120px] capitalize">
                            {field.replace(/_/g, ' ')}:
                        </span>
                        <div className="flex-1">
                            {change.old !== null && change.old !== undefined && (
                                <span className="text-red-600 line-through mr-2 block sm:inline">
                                    {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old)}
                                </span>
                            )}
                            <span className="text-green-600 block sm:inline">
                                {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="p-6 text-center text-gray-500">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-6 text-center text-red-500">
                    Failed to load activity logs. Please try again.
                </div>
            );
        }

        if (!logs || logs.length === 0) {
            return (
                <div className="p-8 text-center text-gray-500">
                    <History size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Activity Yet</h3>
                    <p className="text-sm text-gray-500">
                        Activity logs will appear here once you start making changes to your business.
                    </p>
                </div>
            );
        }

        // Render timeline if we have logs
        return (
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-4">
                    {logs.map((log, index) => {
                        const isExpanded = expandedLog === log.id;
                        const hasDetails =
                            (log.field_changes && Object.keys(log.field_changes).length > 0) ||
                            log.metadata?.reason ||
                            log.metadata?.fields ||
                            (log.metadata?.updates && log.metadata.updates.length > 0);

                        return (
                            <div key={log.id} className="relative pl-10">
                                {/* Timeline dot */}
                                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center z-10">
                                    {getActionIcon(log.action_type)}
                                </div>

                                {/* Card */}
                                <div
                                    className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${hasDetails ? 'cursor-pointer' : ''}`}
                                    onClick={() => hasDetails && setExpandedLog(isExpanded ? null : log.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {getActionDescription(log)}
                                            </p>
                                            {log.metadata?.fields && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Fields: {log.metadata.fields.join(', ')}
                                                </p>
                                            )}
                                            {/* Show approved fields inline for edit_approved and edit_partial */}
                                            {(log.action_type === 'edit_approved' || log.action_type === 'edit_partial') &&
                                                log.field_changes && Object.keys(log.field_changes).length > 0 && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        <span className="text-green-600">Approved:</span> {Object.keys(log.field_changes).map(f => f.replace(/_/g, ' ')).join(', ')}
                                                    </p>
                                                )}
                                            {/* Show rejected fields for edit_partial */}
                                            {log.action_type === 'edit_partial' &&
                                                log.metadata?.rejected_fields && log.metadata.rejected_fields.length > 0 && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        <span className="text-red-600">Rejected:</span> {log.metadata.rejected_fields.join(', ')}
                                                    </p>
                                                )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500">
                                                    {format(new Date(log.created_at), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {format(new Date(log.created_at), 'h:mm a')}
                                                </p>
                                            </div>
                                            {hasDetails && (
                                                <div className="text-gray-400">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && hasDetails && (
                                        <div className="mt-4 pt-4 border-t">
                                            {log.field_changes && Object.keys(log.field_changes).length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Changes Made:</h4>
                                                    {formatFieldChanges(log.field_changes)}
                                                </div>
                                            )}
                                            {log.metadata?.reason && (
                                                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                                    <p className="text-sm text-red-700">
                                                        <strong>Reason:</strong> {log.metadata.reason}
                                                    </p>
                                                </div>
                                            )}
                                            {log.metadata?.updates && Array.isArray(log.metadata.updates) && log.metadata.updates.length > 0 && (
                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                    <p className="text-sm text-blue-800 font-medium mb-1">Updates:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {log.metadata.updates.map((field: string) => (
                                                            <span key={field} className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-200 capitalize">
                                                                {field.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {log.metadata?.rejected_fields && log.metadata.rejected_fields.length > 0 && (
                                                <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                                    <p className="text-sm text-orange-700">
                                                        <strong>Rejected Fields:</strong> {log.metadata.rejected_fields.join(', ')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <History className="text-indigo-600" size={24} />
                    <h2 className="text-lg font-semibold text-gray-900">Activity History</h2>
                    <span className="text-sm text-gray-500">({logs?.length || 0} entries)</span>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    title="Refresh logs"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Timeline */}
            {renderContent()}
        </div>
    );
}

export default BusinessActivityLogsTab;
