
import { supabase } from '../lib/supabase';
import { logEditSubmission, logAutoApproval, FieldChange } from './businessActivityLogService';

export const SENSITIVE_FIELDS = ['business_name', 'address', 'city', 'state', 'postal_code', 'categories'] as const;
export const INSTANT_UPDATE_FIELDS = ['business_phone', 'business_email', 'operating_hours', 'description', 'logo_url', 'cover_image_url', 'website_url', 'social_media'] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];
export type InstantUpdateField = typeof INSTANT_UPDATE_FIELDS[number];

export function isSensitiveField(field: string): boolean {
    return SENSITIVE_FIELDS.includes(field as SensitiveField);
}

export async function submitPendingEdits(businessId: string, changes: Record<string, any>): Promise<void> {
    // 1. Filter out non-sensitive fields to be safe, though caller should handle this
    const pendingData: Record<string, any> = {};

    for (const [key, value] of Object.entries(changes)) {
        if (isSensitiveField(key)) {
            // Map to pending_ column names
            pendingData[`pending_${key}`] = value;
        }
    }

    if (Object.keys(pendingData).length === 0) {
        return; // No sensitive changes
    }

    // 2. Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 3. Upsert into business_pending_edits
    const { error: upsertError } = await supabase
        .from('business_pending_edits')
        .upsert({
            business_id: businessId,
            submitted_by: user.id,
            updated_at: new Date().toISOString(),
            ...pendingData
        }, { onConflict: 'business_id' });

    if (upsertError) throw upsertError;

    // 4. Update business flag
    const { error: updateError } = await supabase
        .from('businesses')
        .update({ has_pending_edits: true })
        .eq('id', businessId);

    if (updateError) throw updateError;

    // 5. Log the edit submission for activity tracking
    await logEditSubmission(businessId, user.id, changes);
}

export async function applyInstantUpdates(businessId: string, changes: Record<string, any>, currentValues?: Record<string, any>): Promise<void> {
    // 1. Filter for instant update fields
    const updateData: Record<string, any> = {};

    for (const [key, value] of Object.entries(changes)) {
        if (!isSensitiveField(key)) { // anything not sensitive is effectively instant, providing it's a valid column
            updateData[key] = value;
        }
    }

    if (Object.keys(updateData).length === 0) {
        return;
    }

    // 2. Get current user ID for logging
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Direct update
    const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId);

    if (error) throw error;

    // 4. Log the auto-approval for activity tracking
    if (user) {
        const fieldChanges: Record<string, FieldChange> = {};
        for (const [key, value] of Object.entries(updateData)) {
            fieldChanges[key] = {
                old: currentValues?.[key] ?? null,
                new: value
            };
        }
        await logAutoApproval(businessId, user.id, fieldChanges);
    }
}
