// src/hooks/useOfferAuditLog.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface OfferAuditLogEntry {
    id: string;
    offer_id: string;
    business_id: string;
    actor_id: string;
    action: string;
    previous_status: string | null;
    new_status: string | null;
    changed_fields: Record<string, any>;
    metadata: Record<string, any>; // contains 'reason', 'changes', etc.
    created_at: string;

    // Joined fields
    actor?: {
        email: string;
        user_metadata: {
            full_name?: string;
        }
    }
}

export const useOfferAuditLog = (offerId: string) => {
    const [logs, setLogs] = useState<OfferAuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        if (!offerId) return;

        setIsLoading(true);
        setError(null);
        try {
            // Need to join with profiles or auth users to get names? 
            // Supabase auth.users is not directly joinable usually unless we have a public view or public.profiles table.
            // Assuming we have public.profiles (standard in this project based on earlier migrations).

            // Check if profiles table exists in previous migrations... yes '20250113_seed_user_profiles.sql' etc.
            // Usually 'profiles' table has 'id' matching 'auth.uid()'.

            const { data, error: fetchError } = await supabase
                .from('offer_audit_log')
                .select(`
                    *,
                    actor:profiles(id, full_name, email)
                `)
                .eq('offer_id', offerId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Map the data to include actor info even if join fails slightly
            setLogs(data as any[] || []);
        } catch (err: any) {
            console.error('Error fetching audit logs:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [offerId]);

    // Helper to log an action manually (if not covered by triggers)
    // IMPORTANT: Most status changes are covered by the DB trigger we added?
    // Wait, in the migration I DECIDED NOT to add a comprehensive auto-trigger for EVERYTHING.
    // I added 'log_offer_action_trigger' but commented it out/made it a helper 'log_offer_activity'.
    // So we need to call it manually from frontend or backend rpc.
    // Actually, looking back at migration `20260129_offer_tracking_enhancements.sql`:
    // I created `log_offer_activity` security definer RPC.

    const logAction = useCallback(async (action: string, metadata: any = {}) => {
        try {
            const { error } = await supabase.rpc('log_offer_activity', {
                p_offer_id: offerId,
                p_action: action,
                p_metadata: metadata
            });

            if (error) throw error;
            // Refresh logs after action
            fetchLogs();
        } catch (err) {
            console.error('Failed to log action:', err);
        }
    }, [offerId, fetchLogs]);

    return {
        logs,
        isLoading,
        error,
        fetchLogs,
        logAction
    };
};
