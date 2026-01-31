import React, { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, Trash2, Edit, FileText } from 'lucide-react';
import { AdminBusinessDetails } from '@/services/adminBusinessService';

interface BusinessAuditHistoryTabProps {
    business: AdminBusinessDetails;
    auditData?: { actions: any[], statusHistory: any[] };
    isLoading: boolean;
}

interface AuditEvent {
    id: string;
    action: string;
    reason?: string;
    created_at: string;
    admin_name?: string;
    is_system?: boolean;
}

export function BusinessAuditHistoryTab({ business, auditData, isLoading }: BusinessAuditHistoryTabProps) {
    const dbHistory = auditData?.actions;
    const statusHistory = auditData?.statusHistory;

    const unifiedHistory = useMemo(() => {
        const events: AuditEvent[] = [];

        // 1. Add "Submitted" event (always exists)
        events.push({
            id: 'submission',
            action: 'submitted',
            created_at: business.created_at,
            is_system: true
        });

        // 2. Add "Legacy" Approved event if needed
        let hasApprovedEvent = false;

        // Check if we have an explicit approve action in DB
        if (dbHistory?.some((h: any) => h.action === 'approve')) {
            hasApprovedEvent = true;
        }

        // Check if we have a status history transition FROM active
        if (!hasApprovedEvent && statusHistory) {
            const wasActive = statusHistory.some((h: any) => h.previous_status === 'active');
            if (wasActive) {
                // If it was active before a change, it must have been approved.
                // We find the earliest 'active' transition or use a fallback.
                const rejectionEvent = statusHistory.find((h: any) => h.previous_status === 'active' && h.new_status === 'rejected');
                if (rejectionEvent) {
                    // It was rejected from active. So it was active BEFORE this rejection.
                    // The approval timestamp is unknown (legacy), but it existed.
                    // We add a legacy approval event just before the rejection or at business creation + epsilon.
                    events.push({
                        id: 'legacy-approve-inferred',
                        action: 'approve',
                        created_at: business.approved_at || business.created_at, // If approved_at is lost, use created_at as baseline
                        admin_name: business.approver?.full_name || 'System (Legacy)',
                        is_system: true,
                        reason: 'Approved prior to audit system'
                    });
                    hasApprovedEvent = true;
                }
            }
        }

        // Check legacy timestamp if still not found
        if (!hasApprovedEvent && business.approved_at) {
            events.push({
                id: 'legacy-approve',
                action: 'approve',
                created_at: business.approved_at,
                admin_name: business.approver?.full_name || (business.approved_by ? 'Admin' : 'System'),
                is_system: true
            });
            hasApprovedEvent = true;
        }

        // Check current status if still not found
        if (!hasApprovedEvent && business.status === 'active') {
            events.push({
                id: 'legacy-approve-unknown',
                action: 'approve',
                created_at: business.updated_at || business.created_at,
                admin_name: 'System (Legacy)',
                is_system: true,
                reason: 'Approved prior to audit system'
            });
        }

        // 3. Add Legacy Reject if needed
        if (business.rejected_at) {
            const hasDbEntry = dbHistory?.some((h: any) => h.action === 'reject');
            if (!hasDbEntry) {
                events.push({
                    id: 'legacy-reject',
                    action: 'reject',
                    reason: business.rejection_reason || undefined,
                    created_at: business.rejected_at,
                    admin_name: business.rejecter?.full_name || 'Admin',
                    is_system: true
                });
            }
        }

        // 4. Add DB History (Actions)
        if (dbHistory) {
            dbHistory.forEach((h: any) => {
                events.push({
                    id: h.id,
                    action: h.action,
                    reason: h.reason,
                    created_at: h.created_at,
                    admin_name: h.admin?.full_name || 'System Admin',
                    is_system: false
                });
            });
        }

        // 5. Add Status History (Transitions that might not be actions)
        // Note: For now, we use status history mainly for inference, to avoid double entry with Actions.
        // A status change usually comes from an action.
        // However, if there's a status change WITHOUT a corresponding action (e.g. manual DB edit), we could look for it.
        // For simplicity, we trust actions + inference for now to avoid clutter.

        // 6. Deduplicate based on ID and timestamp proximity
        const uniqueEvents = Array.from(new Map(events.map(e => [e.id + e.action, e])).values());

        // 7. Sort by date (newest first)
        return uniqueEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [business, dbHistory, statusHistory]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'submitted': return <FileText className="w-5 h-5 text-gray-500" />;
            case 'approve': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'reject': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'soft_delete':
            case 'hard_delete': return <Trash2 className="w-5 h-5 text-red-600" />;
            case 'edit': return <Edit className="w-5 h-5 text-blue-500" />;
            default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
        }
    };

    const formatAction = (action: string) => {
        if (action === 'submitted') return 'Business Application Submitted';
        if (action === 'approve') return 'Business Approved';
        if (action === 'reject') return 'Business Rejected';
        return action.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="space-y-8 pl-2">
            {unifiedHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <p>No audit history found.</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Continuous vertical line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 z-0"></div>

                    <div className="space-y-8 relative z-10">
                        {unifiedHistory.map((entry, index) => (
                            <div key={entry.id + index} className="relative flex gap-6">
                                {/* Icon Column */}
                                <div className="flex-shrink-0 flex items-start pt-1">
                                    <div className="relative z-10 bg-white p-1 rounded-full ring-4 ring-white">
                                        {getActionIcon(entry.action)}
                                    </div>
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-base">{formatAction(entry.action)}</h4>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {entry.is_system && entry.action === 'submitted' ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                                        Initiated by Owner <span className="font-medium text-gray-900">({business.owner?.full_name || 'Unknown'})</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                                        Performed by <span className="font-medium text-gray-900">{entry.admin_name || 'System Admin'}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <time className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded">
                                            {format(new Date(entry.created_at), 'MMM d, yyyy • h:mm a')}
                                        </time>
                                    </div>

                                    {entry.reason && (
                                        <div className="bg-red-50/50 p-3 rounded-md text-sm text-gray-700 mt-3 border border-red-100/50">
                                            <span className="font-semibold text-xs text-red-500 block mb-1 uppercase tracking-wider">Reason provided</span>
                                            {entry.reason}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
