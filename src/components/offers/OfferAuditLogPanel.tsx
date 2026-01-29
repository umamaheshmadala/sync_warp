import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { OfferAuditLogEntry } from '../../types/offers';
import { X, Filter, ChevronDown, Clock, User, FileText, CheckCircle, AlertTriangle, Play, Pause, Trash2, Copy, Star } from 'lucide-react';
import { format } from 'date-fns';

interface OfferAuditLogPanelProps {
    offerId: string;
    isOpen: boolean;
    onClose: () => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    created: <CheckCircle className="w-4 h-4 text-green-500" />,
    edited: <FileText className="w-4 h-4 text-blue-500" />,
    status_change: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    paused: <Pause className="w-4 h-4 text-yellow-500" />,
    resumed: <Play className="w-4 h-4 text-green-500" />,
    archived: <FileText className="w-4 h-4 text-gray-500" />,
    terminated: <X className="w-4 h-4 text-red-500" />,
    deleted: <Trash2 className="w-4 h-4 text-red-500" />,
    duplicated: <Copy className="w-4 h-4 text-purple-500" />,
    featured: <Star className="w-4 h-4 text-yellow-400" />,
    unfeatured: <Star className="w-4 h-4 text-gray-400" />,
};

const ACTION_LABELS: Record<string, string> = {
    created: 'Offer Created',
    edited: 'Offer Updated',
    status_change: 'Status Changed',
    paused: 'Offer Paused',
    resumed: 'Offer Resumed',
    archived: 'Offer Archived',
    terminated: 'Offer Terminated',
    deleted: 'Offer Deleted',
    duplicated: 'Offer Duplicated',
    featured: 'Marked as Featured',
    unfeatured: 'Removed from Featured',
};

export function OfferAuditLogPanel({ offerId, isOpen, onClose }: OfferAuditLogPanelProps) {
    const [logs, setLogs] = useState<OfferAuditLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [filterAction, setFilterAction] = useState<string>('all');
    const PAGE_SIZE = 20;

    useEffect(() => {
        if (isOpen && offerId) {
            setPage(0);
            setLogs([]);
            fetchLogs(0, true);
        }
    }, [isOpen, offerId, filterAction]);

    const fetchLogs = async (pageNumber: number, replace: boolean = false) => {
        try {
            setLoading(true);
            let query = supabase
                .from('offer_audit_log')
                .select(`
          *,
          actor:profiles (
            email
          )
        `)
                .eq('offer_id', offerId)
                .order('created_at', { ascending: false })
                .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);

            if (filterAction !== 'all') {
                query = query.eq('action', filterAction);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            if (data) {
                const typedData = data as any[];
                setLogs(prev => replace ? typedData : [...prev, ...typedData]);
                setHasMore(typedData.length === PAGE_SIZE);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchLogs(nextPage);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Offer History</h2>
                        <p className="text-sm text-gray-500">Track changes and activities</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="text-sm bg-transparent border-none focus:ring-0 text-gray-600 font-medium cursor-pointer"
                    >
                        <option value="all">All Actions</option>
                        <option value="created">Created</option>
                        <option value="edited">Edited</option>
                        <option value="paused">Paused</option>
                        <option value="resumed">Resumed</option>
                        <option value="terminated">Terminated</option>
                        <option value="archived">Archived</option>
                        <option value="featured">Featured</option>
                    </select>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                        {logs.map((log) => (
                            <div key={log.id} className="relative pl-8">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[9px] top-0 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                                    {ACTION_ICONS[log.action] || <FileText className="w-4 h-4 text-gray-400" />}
                                </div>

                                {/* Content */}
                                <div className="space-y-1">
                                    <div className="flex items-start justify-between">
                                        <p className="font-medium text-gray-900 text-sm">
                                            {ACTION_LABELS[log.action] || log.action}
                                        </p>
                                        <time className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                        </time>
                                    </div>

                                    {/* Actor */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <User className="w-3 h-3" />
                                        <span>{log.actor?.email?.split('@')[0] || 'Unknown User'}</span>
                                    </div>

                                    {/* Details/Metadata */}
                                    {(log.metadata?.reason || log.changed_fields) && (
                                        <div className="mt-2 text-xs bg-gray-50 p-2.5 rounded-md border border-gray-100">
                                            {log.metadata?.reason && (
                                                <div className="mb-1">
                                                    <span className="font-medium text-gray-700">Reason:</span> {log.metadata.reason}
                                                </div>
                                            )}
                                            {/* Can expand to show changed fields if needed */}
                                            {log.action === 'featured' && log.metadata?.priority && (
                                                <div>Priority: #{log.metadata.priority}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            </div>
                        )}

                        {!loading && logs.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No history found for this offer.
                            </div>
                        )}

                        {!loading && hasMore && (
                            <div className="pt-4 pl-8">
                                <button
                                    onClick={loadMore}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    Load older entries
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
