/**
 * Business Activity Log Service
 * 
 * Comprehensive logging service for tracking all business-related activities.
 * Used by both admin and owner views to display activity history.
 */

import { supabase } from '@/lib/supabase';

// Action types for business activities
export type ActivityActionType =
    // Business registration lifecycle
    | 'business_registered'
    | 'business_approved'
    | 'business_rejected'
    // Edit workflow
    | 'edit_submitted'
    | 'edit_approved'
    | 'edit_rejected'
    | 'edit_partial'
    | 'edit_auto_approved'
    // Product lifecycle
    | 'product_created'
    | 'product_updated'
    | 'product_deleted'
    // Offer lifecycle
    | 'offer_created'
    | 'offer_updated'
    | 'offer_activated'
    | 'offer_paused'
    | 'offer_terminated'
    // Other updates
    | 'hours_updated'
    | 'media_uploaded'
    | 'media_deleted';

export type ActorType = 'owner' | 'admin' | 'system';

export interface FieldChange {
    old: any;
    new: any;
}

export interface ActivityLogEntry {
    id: string;
    business_id: string;
    action_type: ActivityActionType;
    actor_id: string | null;
    actor_type: ActorType;
    field_changes: Record<string, FieldChange>;
    metadata: Record<string, any>;
    created_at: string;
    // Joined data (for display)
    actor?: {
        full_name: string;
        email: string;
    };
    business?: {
        business_name: string;
    };
}

export interface LogActivityParams {
    businessId: string;
    actionType: ActivityActionType;
    actorId: string | null;
    actorType: ActorType;
    fieldChanges?: Record<string, FieldChange>;
    metadata?: Record<string, any>;
}

/**
 * Log a business activity
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
    const {
        businessId,
        actionType,
        actorId,
        actorType,
        fieldChanges = {},
        metadata = {}
    } = params;

    try {
        const { error } = await supabase
            .from('business_activity_log')
            .insert({
                business_id: businessId,
                action_type: actionType,
                actor_id: actorId,
                actor_type: actorType,
                field_changes: fieldChanges,
                metadata: metadata
            });

        if (error) {
            console.error('Failed to log activity:', error);
            // Don't throw - logging should not block primary operations
        }
    } catch (err) {
        console.error('Error in logActivity:', err);
    }
}

/**
 * Log when owner submits pending edits
 */
export async function logEditSubmission(
    businessId: string,
    ownerId: string,
    changes: Record<string, any>
): Promise<void> {
    // Convert changes to field_changes format
    const fieldChanges: Record<string, FieldChange> = {};
    for (const [key, value] of Object.entries(changes)) {
        fieldChanges[key] = { old: null, new: value }; // Old value captured on approval
    }

    await logActivity({
        businessId,
        actionType: 'edit_submitted',
        actorId: ownerId,
        actorType: 'owner',
        fieldChanges,
        metadata: {
            fields_count: Object.keys(changes).length,
            fields: Object.keys(changes)
        }
    });
}

/**
 * Log when admin approves all changes
 */
export async function logEditApproval(
    businessId: string,
    adminId: string,
    fieldChanges: Record<string, FieldChange>,
    notes?: string
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'edit_approved',
        actorId: adminId,
        actorType: 'admin',
        fieldChanges,
        metadata: {
            fields_count: Object.keys(fieldChanges).length,
            notes: notes || null
        }
    });
}

/**
 * Log when admin rejects all changes
 */
export async function logEditRejection(
    businessId: string,
    adminId: string,
    rejectedFields: string[],
    reason?: string
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'edit_rejected',
        actorId: adminId,
        actorType: 'admin',
        metadata: {
            rejected_fields: rejectedFields,
            fields_count: rejectedFields.length,
            reason: reason || null
        }
    });
}

/**
 * Log when admin partially approves changes
 */
export async function logEditPartial(
    businessId: string,
    adminId: string,
    approvedChanges: Record<string, FieldChange>,
    rejectedFields: string[],
    reason?: string
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'edit_partial',
        actorId: adminId,
        actorType: 'admin',
        fieldChanges: approvedChanges,
        metadata: {
            approved_count: Object.keys(approvedChanges).length,
            rejected_fields: rejectedFields,
            rejected_count: rejectedFields.length,
            reason: reason || null
        }
    });
}

/**
 * Log when instant update fields are auto-approved
 */
export async function logAutoApproval(
    businessId: string,
    ownerId: string,
    changes: Record<string, FieldChange>
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'edit_auto_approved',
        actorId: ownerId,
        actorType: 'system',
        fieldChanges: changes,
        metadata: {
            fields_count: Object.keys(changes).length,
            fields: Object.keys(changes)
        }
    });
}

/**
 * Log business registration
 */
export async function logBusinessRegistration(
    businessId: string,
    ownerId: string
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'business_registered',
        actorId: ownerId,
        actorType: 'owner'
    });
}

/**
 * Log business approval
 */
export async function logBusinessApproval(
    businessId: string,
    adminId: string
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'business_approved',
        actorId: adminId,
        actorType: 'admin'
    });
}

/**
 * Log business rejection
 */
export async function logBusinessRejection(
    businessId: string,
    adminId: string,
    reason?: string
): Promise<void> {
    await logActivity({
        businessId,
        actionType: 'business_rejected',
        actorId: adminId,
        actorType: 'admin',
        metadata: { reason: reason || null }
    });
}

/**
 * Fetch activity logs for a business (owner view)
 */
export async function getBusinessActivityLogs(
    businessId: string,
    limit: number = 50
): Promise<ActivityLogEntry[]> {
    const { data, error } = await supabase
        .from('business_activity_log')
        .select(`
      id,
      business_id,
      action_type,
      actor_id,
      actor_type,
      field_changes,
      metadata,
      created_at
    `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch business activity logs:', error);
        throw error;
    }

    return data || [];
}

/**
 * Fetch all activity logs (admin view) with pagination and filters
 */
export interface ActivityLogFilters {
    businessId?: string;
    actionType?: ActivityActionType;
    actorType?: ActorType;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
}

export async function getActivityLogs(
    filters: ActivityLogFilters = {},
    page: number = 1,
    pageSize: number = 20
): Promise<{ data: ActivityLogEntry[]; total: number }> {
    let query = supabase
        .from('business_activity_log')
        .select(`
      id,
      business_id,
      action_type,
      actor_id,
      actor_type,
      field_changes,
      metadata,
      created_at,
      businesses!inner (business_name)
    `, { count: 'exact' });

    // Apply filters
    if (filters.businessId) {
        query = query.eq('business_id', filters.businessId);
    }
    if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
    }
    if (filters.actorType) {
        query = query.eq('actor_type', filters.actorType);
    }
    if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
    }
    // Business name search
    if (filters.searchTerm) {
        query = query.ilike('businesses.business_name', `%${filters.searchTerm}%`);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Failed to fetch activity logs:', error);
        throw error;
    }

    // Transform the data to match our interface
    const transformedData = (data || []).map((item: any) => ({
        ...item,
        business: item.businesses
    }));

    return {
        data: transformedData,
        total: count || 0
    };
}

/**
 * Get action type display info
 */
export function getActionTypeDisplay(actionType: ActivityActionType): {
    label: string;
    icon: string;
    color: string;
} {
    const displays: Record<ActivityActionType, { label: string; icon: string; color: string }> = {
        business_registered: { label: 'Business Registered', icon: 'FileText', color: 'blue' },
        business_approved: { label: 'Business Approved', icon: 'CheckCircle', color: 'green' },
        business_rejected: { label: 'Business Rejected', icon: 'XCircle', color: 'red' },
        edit_submitted: { label: 'Changes Submitted', icon: 'Clock', color: 'yellow' },
        edit_approved: { label: 'Changes Approved', icon: 'CheckCircle', color: 'green' },
        edit_rejected: { label: 'Changes Rejected', icon: 'XCircle', color: 'red' },
        edit_partial: { label: 'Partially Approved', icon: 'AlertCircle', color: 'orange' },
        edit_auto_approved: { label: 'Auto-Approved', icon: 'Zap', color: 'purple' },
        product_created: { label: 'Product Created', icon: 'Package', color: 'blue' },
        product_updated: { label: 'Product Updated', icon: 'Package', color: 'blue' },
        product_deleted: { label: 'Product Deleted', icon: 'Trash2', color: 'red' },
        offer_created: { label: 'Offer Created', icon: 'Tag', color: 'blue' },
        offer_updated: { label: 'Offer Updated', icon: 'Tag', color: 'blue' },
        offer_activated: { label: 'Offer Activated', icon: 'Play', color: 'green' },
        offer_paused: { label: 'Offer Paused', icon: 'Pause', color: 'yellow' },
        offer_terminated: { label: 'Offer Terminated', icon: 'Square', color: 'red' },
        hours_updated: { label: 'Hours Updated', icon: 'Clock', color: 'blue' },
        media_uploaded: { label: 'Media Uploaded', icon: 'Image', color: 'blue' },
        media_deleted: { label: 'Media Deleted', icon: 'Trash2', color: 'red' }
    };

    return displays[actionType] || { label: actionType, icon: 'Circle', color: 'gray' };
}

/**
 * Log offer activity (Wrapper for Offer hooks)
 */
export async function logOfferActivity(
    businessId: string,
    actionType: ActivityActionType,
    offerId: string,
    offerTitle: string,
    actorId: string | null = null,
    metadata: Record<string, any> = {}
): Promise<void> {
    let auditCode = metadata.audit_code;

    // If audit_code is not provided, try to fetch it
    if (!auditCode) {
        try {
            const { data } = await supabase
                .from('offers')
                .select('audit_code')
                .eq('id', offerId)
                .single();
            if (data) {
                auditCode = data.audit_code;
            }
        } catch (e) {
            console.warn('Failed to fetch audit code for log:', e);
        }
    }

    await logActivity({
        businessId,
        actionType,
        actorId: actorId || (await supabase.auth.getUser()).data.user?.id || null,
        actorType: 'owner', // Default to owner for now, offers are mostly owner managed
        metadata: {
            ...metadata,
            offer_id: offerId,
            name: offerTitle, // Use 'name' to align with product logs for generic display if needed
            audit_code: auditCode
        }
    });
}
