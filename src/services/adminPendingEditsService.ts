import { supabase } from '../lib/supabase';
import { notifyOwnerOfEditDecision } from './adminNotificationService';
import { logEditApproval, logEditRejection, logEditPartial, FieldChange } from './businessActivityLogService';

export interface PendingEditSummary {
    id: string; // business_pending_edits id
    business_id: string;
    business_name: string; // Current name
    owner_name: string;
    submitted_at: string;
    change_count: number;
}

export interface PendingEditDetails {
    id: string;
    business_id: string;
    submitted_by: string;
    created_at: string;
    updated_at: string;
    pending_changes: {
        business_name?: string;
        address?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        categories?: string[];
    };
    current_values: {
        business_name: string;
        address: string;
        city: string;
        state: string;
        postal_code: string;
        categories: string[];
        owner_email?: string;
        owner_phone?: string;
        owner_first_name?: string;
        owner_last_name?: string;
    };
}

export interface FieldDecision {
    field: 'business_name' | 'address' | 'city' | 'state' | 'postal_code' | 'categories';
    approved: boolean;
}

const mapPendingToChanges = (record: any) => {
    const changes: Record<string, any> = {};
    if (record.pending_business_name !== null) changes.business_name = record.pending_business_name;
    if (record.pending_address !== null) changes.address = record.pending_address;
    if (record.pending_city !== null) changes.city = record.pending_city;
    if (record.pending_state !== null) changes.state = record.pending_state;
    if (record.pending_postal_code !== null) changes.postal_code = record.pending_postal_code;
    if (record.pending_categories !== null) changes.categories = record.pending_categories;
    return changes;
};

export const adminPendingEditsService = {
    /**
     * Get list of businesses with pending edits
     */
    async getPendingEditsList(): Promise<PendingEditSummary[]> {
        // Fetch pending edits joined with business - include pending fields for count
        const { data, error } = await supabase
            .from('business_pending_edits')
            .select(`
                id,
                business_id,
                created_at,
                submitted_by,
                pending_business_name,
                pending_address,
                pending_city,
                pending_state,
                pending_postal_code,
                pending_categories,
                businesses (
                    business_name,
                    user_id
                )
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Manually fetch profiles for submitted_by users
        const submittedByIds = [...new Set(data.map((item: any) => item.submitted_by).filter(Boolean))];
        let profilesMap: Record<string, any> = {};

        if (submittedByIds.length > 0) {
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .in('id', submittedByIds);

            if (!profileError && profiles) {
                profiles.forEach(p => {
                    profilesMap[p.id] = p;
                });
            }
        }

        return data.map((item: any) => {
            // Count non-null pending fields
            const pendingFields = [
                item.pending_business_name,
                item.pending_address,
                item.pending_city,
                item.pending_state,
                item.pending_postal_code,
                item.pending_categories
            ].filter(val => val !== null && val !== undefined);

            const submittedByProfile = profilesMap[item.submitted_by];
            const ownerName = submittedByProfile
                ? `${submittedByProfile.first_name || ''} ${submittedByProfile.last_name || ''}`.trim() || submittedByProfile.email
                : 'Unknown';

            const businessName = Array.isArray(item.businesses)
                ? item.businesses[0]?.business_name
                : item.businesses?.business_name;

            return {
                id: item.id,
                business_id: item.business_id,
                business_name: businessName || 'Unknown Business',
                owner_name: ownerName,
                submitted_at: item.created_at,
                change_count: pendingFields.length
            };
        });
    },

    /**
     * Get detailed comparison for a specific pending edit
     */
    async getPendingEditDetails(businessId: string): Promise<PendingEditDetails> {
        // Fetch pending record
        const { data: pending, error: pendingError } = await supabase
            .from('business_pending_edits')
            .select('*')
            .eq('business_id', businessId)
            .single();

        if (pendingError) throw pendingError;

        // Fetch current business details (without profile join to avoid 400)
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select(`
                business_name,
                address,
                city,
                state,
                postal_code,
                categories,
                user_id
            `)
            .eq('id', businessId)
            .single();

        if (businessError) throw businessError;

        // Manually fetch owner profile
        let ownerProfile: any = null;
        if (business.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email, phone, first_name, last_name')
                .eq('id', business.user_id)
                .single();
            ownerProfile = profile;
        }

        return {
            id: pending.id,
            business_id: pending.business_id,
            submitted_by: pending.submitted_by,
            created_at: pending.created_at,
            updated_at: pending.updated_at,
            pending_changes: mapPendingToChanges(pending),
            current_values: {
                business_name: business.business_name,
                address: business.address,
                city: business.city,
                state: business.state,
                postal_code: business.postal_code,
                categories: business.categories,
                owner_email: ownerProfile?.email,
                owner_phone: ownerProfile?.phone,
                owner_first_name: ownerProfile?.first_name,
                owner_last_name: ownerProfile?.last_name,
            }
        };
    },

    /**
     * Approve ALL pending changes
     */
    async approveAllPendingEdits(businessId: string): Promise<void> {
        // 1. Get the pending changes to apply
        const details = await this.getPendingEditDetails(businessId);
        const updates = details.pending_changes;

        if (Object.keys(updates).length === 0) return;

        // 2. Get admin ID for logging
        const { data: { user } } = await supabase.auth.getUser();

        // 3. Update business with new values AND reset has_pending_edits
        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                ...updates,
                has_pending_edits: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId);

        if (updateError) throw updateError;

        // 4. Delete the pending record
        const { error: deleteError } = await supabase
            .from('business_pending_edits')
            .delete()
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        // 5. Log the approval with field changes
        const fieldChanges: Record<string, FieldChange> = {};
        for (const [key, newValue] of Object.entries(updates)) {
            fieldChanges[key] = {
                old: details.current_values[key as keyof typeof details.current_values],
                new: newValue
            };
        }
        await logEditApproval(businessId, user?.id || '', fieldChanges);

        // 6. Notify Owner
        await notifyOwnerOfEditDecision(businessId, 'approved');
    },

    /**
     * Reject ALL pending changes
     */
    async rejectAllPendingEdits(businessId: string, reason: string): Promise<void> {
        // 1. Get pending changes for logging
        const details = await this.getPendingEditDetails(businessId);
        const rejectedFields = Object.keys(details.pending_changes);

        // 2. Get admin ID for logging
        const { data: { user } } = await supabase.auth.getUser();

        // 3. Reset has_pending_edits on business
        const { error: updateError } = await supabase
            .from('businesses')
            .update({ has_pending_edits: false })
            .eq('id', businessId);

        if (updateError) throw updateError;

        // 4. Delete the pending record
        const { error: deleteError } = await supabase
            .from('business_pending_edits')
            .delete()
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        // 5. Log the rejection
        await logEditRejection(businessId, user?.id || '', rejectedFields, reason);

        // 6. Notify Owner
        await notifyOwnerOfEditDecision(businessId, 'rejected', { reason });
    },

    /**
     * Partially approve changes
     */
    async partialApprovePendingEdits(businessId: string, decisions: FieldDecision[], reason?: string): Promise<void> {
        const details = await this.getPendingEditDetails(businessId);

        // Check if this is actually a full approval or full rejection
        const pendingKeys = Object.keys(details.pending_changes);
        const approvedKeys = decisions.filter(d => d.approved).map(d => d.field);
        const rejectedKeys = decisions.filter(d => !d.approved).map(d => d.field);

        // If all pending keys are in the approved list
        const isFullApproval = pendingKeys.length > 0 && pendingKeys.every(key => approvedKeys.includes(key as any));

        // If all pending keys are in the rejected list
        const isFullRejection = pendingKeys.length > 0 && pendingKeys.every(key => rejectedKeys.includes(key as any));

        if (isFullApproval) {
            return this.approveAllPendingEdits(businessId);
        }

        if (isFullRejection) {
            return this.rejectAllPendingEdits(businessId, reason || 'Edits rejected by admin');
        }

        const updatesToApply: Record<string, any> = {};

        decisions.forEach(d => {
            if (d.approved) {
                // @ts-ignore
                const value = details.pending_changes[d.field];
                if (value !== undefined) {
                    updatesToApply[d.field] = value;
                }
            }
        });

        // 1. Get admin ID for logging
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Update business with APPROVED values AND reset has_pending_edits
        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                ...updatesToApply,
                has_pending_edits: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId);

        if (updateError) throw updateError;

        // 3. Delete the pending record
        const { error: deleteError } = await supabase
            .from('business_pending_edits')
            .delete()
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        // 4. Log partial approval with field changes
        const approvedFields = decisions.filter(d => d.approved).map(d => d.field);
        const rejectedFields = decisions.filter(d => !d.approved).map(d => d.field);

        const approvedChanges: Record<string, FieldChange> = {};
        for (const [key, newValue] of Object.entries(updatesToApply)) {
            approvedChanges[key] = {
                old: details.current_values[key as keyof typeof details.current_values],
                new: newValue
            };
        }
        await logEditPartial(businessId, user?.id || '', approvedChanges, rejectedFields, reason);

        // 5. Notify Owner
        await notifyOwnerOfEditDecision(businessId, 'partial', {
            approvedFields,
            rejectedFields
        });
    }
};
