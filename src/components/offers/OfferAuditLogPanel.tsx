import React, { useEffect } from 'react';
import { X, User, Activity } from 'lucide-react';
import { useOfferAuditLog } from '../../hooks/useOfferAuditLog';
import { format } from 'date-fns';

interface OfferAuditLogPanelProps {
    isOpen: boolean;
    onClose: () => void;
    offerId: string;
    offerTitle: string;
}

export const OfferAuditLogPanel: React.FC<OfferAuditLogPanelProps> = ({
    isOpen,
    onClose,
    offerId,
    offerTitle
}) => {
    const { logs, isLoading, fetchLogs } = useOfferAuditLog(offerId);

    useEffect(() => {
        if (isOpen && offerId) {
            fetchLogs();
        }
    }, [isOpen, offerId, fetchLogs]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

                <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                    <div className="w-screen max-w-md bg-white shadow-xl flex flex-col">
                        {/* Header */}
                        <div className="px-4 py-6 bg-gray-50 flex items-center justify-between border-b border-gray-200 sm:px-6">
                            <div>
                                <h2 className="text-lg font-medium text-gray-900">Audit History</h2>
                                <p className="text-sm text-gray-500 mt-1 truncate max-w-[280px]">{offerTitle}</p>
                            </div>
                            <button
                                type="button"
                                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                onClick={onClose}
                            >
                                <X className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Activity className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                                    <p>No activity recorded yet.</p>
                                </div>
                            ) : (
                                <ul className="space-y-6">
                                    {logs.map((log) => (
                                        <li key={log.id} className="relative pb-6 last:pb-0">
                                            {/* Vertical Line */}
                                            <div className="absolute top-5 left-4 -ml-px h-full w-0.5 bg-gray-200 last:hidden" aria-hidden="true"></div>

                                            <div className="relative flex items-start space-x-3">
                                                <div className="relative">
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                                                        ${log.action === 'created' ? 'bg-green-100' :
                                                            log.action === 'deleted' ? 'bg-red-100' :
                                                                log.action === 'paused' ? 'bg-orange-100' :
                                                                    log.action === 'terminated' ? 'bg-red-200' : 'bg-gray-100'}
                                                     `}>
                                                        {log.action === 'created' ? <div className="w-2.5 h-2.5 bg-green-500 rounded-full" /> :
                                                            log.action === 'deleted' ? <div className="w-2.5 h-2.5 bg-red-500 rounded-full" /> :
                                                                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full" />}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {log.action.replace('_', ' ').toUpperCase()}
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 text-sm text-gray-700">
                                                        {log.previous_status && log.new_status && (
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">{log.previous_status}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200 font-medium">{log.new_status}</span>
                                                            </div>
                                                        )}

                                                        {log.metadata?.reason && (
                                                            <p className="text-gray-600 italic border-l-2 border-gray-300 pl-2 my-1">
                                                                "{log.metadata.reason}"
                                                            </p>
                                                        )}

                                                        {/* Diff for changes if available */}
                                                        {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                                                            <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                                                                Changes: {Object.keys(log.changed_fields).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-400 flex items-center">
                                                        <User className="w-3 h-3 mr-1" />
                                                        {log.actor?.user_metadata?.full_name || log.actor?.email || 'System'}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
