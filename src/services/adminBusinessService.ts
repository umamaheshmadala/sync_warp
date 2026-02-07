import { supabase } from '@/lib/supabase';
import { sendBusinessApprovalNotification, sendBusinessRejectionNotification } from './adminNotificationService';

export interface BusinessListFilters {
    status?: string;
    city?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    year?: number;
    month?: number;
    search?: string;
}

export interface BusinessListParams {
    filters: BusinessListFilters;
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface AdminBusinessView {
    id: string;
    business_name: string;
    business_type: string;
    business_email: string | null;
    business_phone: string | null;
    city: string;
    categories: string[];
    status: string;
    created_at: string;
    owner: {
        id: string;
        full_name: string;
        email: string;
    };
    approved_at: string | null;
    rejected_at: string | null;
    deleted_at: string | null;
    last_admin_action_at: string | null;
    approved_by?: string | null;
    rejection_reason?: string | null;
}

export interface BusinessListResult {
    businesses: AdminBusinessView[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function getBusinessList(params: BusinessListParams): Promise<BusinessListResult> {
    const { filters, page, pageSize, sortBy, sortOrder } = params;

    let query = supabase
        .from('businesses')
        .select(`
      id,
      business_name,
      business_type,
      business_email,
      business_phone,
      city,
      categories,
      status,
      created_at,
      approved_at,
      rejected_at,
      deleted_at,
      last_admin_action_at,
      owner:user_id (
        id,
        full_name,
        email
      )
    `, { count: 'exact' });

    // Status filter (from tab)
    if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    // City filter
    if (filters.city) {
        const cities = filters.city.split(',').map(c => c.trim()).filter(Boolean);
        if (cities.length > 0) {
            query = query.in('city', cities);
        }
    }

    // Category filter
    if (filters.category) {
        const cats = filters.category.split(',').map(c => c.trim()).filter(Boolean);
        // Using overlaps for OR logic on array column
        if (cats.length > 0) {
            query = query.overlaps('categories', cats);
        }
    }

    // Date range filter
    if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
    }

    // Year filter
    if (filters.year) {
        const yearStart = `${filters.year}-01-01`;
        const yearEnd = `${filters.year}-12-31`;
        query = query.gte('created_at', yearStart).lte('created_at', yearEnd);
    }

    // Month filter (requires year)
    if (filters.month && filters.year) {
        const monthStart = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        // Get last day of month
        const lastDay = new Date(filters.year, filters.month, 0).getDate();
        const monthEnd = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
        query = query.gte('created_at', monthStart).lte('created_at', monthEnd);
    }

    // Search filter (case-insensitive)
    if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`business_name.ilike.${searchTerm},business_email.ilike.${searchTerm},business_phone.ilike.${searchTerm}`);
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to match interface (flatten owner slightly if needed or just cast)
    const businesses = (data || []).map((b: any) => ({
        ...b,
        owner: b.owner || { id: '', full_name: 'Unknown', email: '' } // Handle potentially missing owner
    }));

    return {
        businesses: businesses as AdminBusinessView[],
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}

export async function getBusinessStats(): Promise<{
    total: number;
    pending: number;
    active: number;
    rejected: number;
    deleted: number;
}> {
    const { data, error } = await supabase
        .from('businesses')
        .select('status');

    if (error) throw error;

    const stats = {
        total: data?.length || 0,
        pending: 0,
        active: 0,
        rejected: 0,
        deleted: 0
    };

    data?.forEach(b => {
        switch (b.status) {
            case 'pending': stats.pending++; break;
            case 'active': stats.active++; break;
            case 'rejected': stats.rejected++; break;
            case 'deleted': stats.deleted++; break;
        }
    });

    return stats;
}

export async function getFilterOptions(): Promise<{
    cities: string[];
    categories: string[];
    years: number[];
}> {
    // Get distinct cities
    const { data: cityData } = await supabase
        .from('businesses')
        .select('city')
        .not('city', 'is', null);

    const cities = [...new Set(cityData?.map(b => b.city).filter(Boolean))].sort();

    // Get categories from business_categories table
    const { data: catData } = await supabase
        .from('business_categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order');

    const categories = catData?.map(c => c.name) || [];

    // Get distinct years
    const { data: yearData } = await supabase
        .from('businesses')
        .select('created_at');

    const years = [...new Set(
        yearData?.map(b => new Date(b.created_at).getFullYear())
    )].sort((a, b) => b - a);

    return { cities, categories, years };
}

// --- Story 6.3.3 Additions ---

// Approve business
export async function approveBusiness(businessId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('admin_approve_business', {
        p_business_id: businessId,
        p_admin_id: user.id
    });

    if (error) throw error;

    // Log action
    await logAdminAction(businessId, user.id, 'approve', 'Business approved by admin');

    // Send notification to business owner
    try {
        await sendBusinessApprovalNotification(businessId);
    } catch (notifyError) {
        console.error('Failed to send approval notification:', notifyError);
        // Don't throw - notification failure shouldn't block the operation
    }
}

// Reject business
export async function rejectBusiness(businessId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('admin_reject_business', {
        p_business_id: businessId,
        p_admin_id: user.id,
        p_reason: reason
    });

    if (error) throw error;

    // Log action
    await logAdminAction(businessId, user.id, 'reject', reason);

    // Send notification to business owner
    try {
        await sendBusinessRejectionNotification(businessId, reason);
    } catch (notifyError) {
        console.error('Failed to send rejection notification:', notifyError);
        // Don't throw - notification failure shouldn't block the operation
    }
}

// ... helper function to avoid repetition ...
async function logAdminAction(businessId: string, adminId: string, action: string, reason: string, changes: any = {}) {
    const { error } = await supabase
        .from('admin_business_actions')
        .insert({
            business_id: businessId,
            admin_id: adminId,
            action: action,
            reason: reason,
            changes_json: changes
        });
    if (error) console.error('Failed to log admin action:', error);
}

// ...

export async function deleteBusiness(businessId: string, reason: string = 'Deleted by admin'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('admin_soft_delete_business', {
        p_business_id: businessId,
        p_admin_id: user.id,
        p_reason: reason
    });

    if (error) throw error;

    // Log action handled by RPC
}

export async function restoreBusiness(businessId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('admin_restore_business', {
        p_business_id: businessId,
        p_admin_id: user.id
    });

    if (error) throw error;
    // Log action handled by RPC
}

export async function hardDeleteBusiness(businessId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Snapshot business details for audit log before deletion
    const { data: businessSnapshot } = await supabase
        .from('businesses')
        .select('business_name, business_email, business_phone, address, city, business_type, owner:user_id(email, full_name, phone_number)')
        .eq('id', businessId)
        .single();

    const snapshot = {
        business_name: businessSnapshot?.business_name || 'Unknown',
        email: businessSnapshot?.business_email,
        phone: businessSnapshot?.business_phone,
        address: businessSnapshot?.address,
        city: businessSnapshot?.city,
        type: businessSnapshot?.business_type,
        owner_name: (businessSnapshot?.owner as any)?.full_name,
        owner_email: (businessSnapshot?.owner as any)?.email,
        owner_phone: (businessSnapshot?.owner as any)?.phone_number,
        hard_deleted_at: new Date().toISOString()
    };

    const { error } = await supabase.rpc('admin_hard_delete_business', {
        p_business_id: businessId,
        p_admin_id: user.id,
        p_reason: reason
    });

    if (error) throw error;

    // Log action manually with snapshot (Required as RPC cannot log after deletion and we want to persist data)
    await logAdminAction(businessId, user.id, 'hard_delete', reason, { snapshot });
}
export interface AdminBusinessDetails extends AdminBusinessView {
    updated_at?: string;
    business_description?: string;
    business_address?: string;
    business_website?: string;
    operating_hours?: any;
    social_media?: any;
    logo_url?: string;
    cover_image_url?: string;
    images?: string[];
    approver?: { full_name: string };
    rejecter?: { full_name: string };
    owner: {
        id: string;
        full_name: string;
        email: string;
        phone_number?: string;
        created_at?: string;
    };
}

export async function getBusinessDetails(businessId: string): Promise<AdminBusinessDetails> {
    const { data, error } = await supabase
        .from('businesses')
        .select(`
            id,
            business_name,
            business_type,
            business_email,
            business_phone,
            city,
            categories,
            status,
            created_at,
            approved_at,
            rejected_at,
            deleted_at,
            last_admin_action_at,
            approved_by,
            rejected_by,
            rejection_reason,
            updated_at,
            business_description:description,
            business_address:address,
            business_website:website_url,
            operating_hours,
            social_media,
            logo_url,
            cover_image_url,
            images:gallery_images,
            owner:user_id(
                id,
                full_name,
                email
            )
        `)
        .eq('id', businessId)
        .single();

    if (error) throw error;

    // Supabase might return owner as an array for foreign key joins, flatten it
    const businessData = { ...data } as any;
    if (Array.isArray(businessData.owner)) {
        businessData.owner = businessData.owner[0] || null;
    }

    // Ensure owner object exists to match interface
    if (!businessData.owner) {
        businessData.owner = {
            id: '',
            full_name: 'Unknown',
            email: '',
        };
    }

    // Manually fetch approver and rejecter names from 'profiles' table
    // This is more robust than relying on tricky joins if FKs are missing or ambiguous
    const adminIds = [businessData.approved_by, businessData.rejected_by].filter(Boolean);

    if (adminIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', adminIds);

        if (profiles) {
            if (businessData.approved_by) {
                const approver = profiles.find(p => p.id === businessData.approved_by);
                if (approver) businessData.approver = { full_name: approver.full_name };
            }
            if (businessData.rejected_by) {
                const rejecter = profiles.find(p => p.id === businessData.rejected_by);
                if (rejecter) businessData.rejecter = { full_name: rejecter.full_name };
            }
        }
    }

    return businessData as AdminBusinessDetails;
}

export async function getBusinessAuditHistory(businessId: string) {
    // Run queries in parallel for better performance
    const [actionsResult, statusResult] = await Promise.all([
        supabase
            .from('admin_business_actions')
            .select('id, action, reason, created_at, admin_id')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false }),

        supabase
            .from('business_status_history')
            .select(`
                id,
            previous_status,
            new_status,
            change_reason,
            created_at,
            changed_by
                `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
    ]);

    if (actionsResult.error) throw actionsResult.error;
    if (statusResult.error) throw statusResult.error;

    // Manual join for admin details in actions
    const logs = actionsResult.data || [];
    const adminIds = [...new Set(logs.map(l => l.admin_id).filter(Boolean))];

    let adminsMap: Record<string, { full_name: string, email: string }> = {};
    if (adminIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', adminIds);

        profiles?.forEach(p => {
            adminsMap[p.id] = { full_name: p.full_name, email: p.email };
        });
    }

    const enrichedActions = logs.map(log => ({
        ...log,
        admin: adminsMap[log.admin_id] || { full_name: 'Unknown Admin', email: '' }
    }));

    return {
        actions: enrichedActions,
        statusHistory: statusResult.data
    };
}



export async function updateBusiness(
    businessId: string,
    updates: Partial<AdminBusinessView>,
    changesJson: Record<string, { from: any, to: any }>
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Update business table
    const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId);

    if (error) throw error;

    // 2. Log action manually
    // We only log if there are meaningful changes
    if (Object.keys(changesJson).length > 0) {
        const { error: logError } = await supabase
            .from('admin_business_actions')
            .insert({
                business_id: businessId,
                admin_id: user.id,
                action: 'edit',
                changes_json: changesJson,
                reason: 'Admin updated business details'
            });

        if (logError) console.error('Failed to log admin action:', logError);
    }
}

// --- Story 6.3.5: Global Audit Log ---

export interface GlobalAuditLogParams {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    adminId?: string;
    action?: string;
}

export interface AdminAuditLogEntry {
    id: string;
    action: string;
    reason: string;
    changes_json: any;
    created_at: string;
    admin_id: string;
    business_id: string;
    admin: {
        full_name: string;
        email?: string;
    };
    business: {
        id: string;
        business_name: string;
    };
}

export interface AuditLogResult {
    logs: AdminAuditLogEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface GlobalAuditLogParams {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    adminId?: string;
    action?: string;
    search?: string;
    sortBy?: 'created_at' | 'action';
    sortOrder?: 'asc' | 'desc';
}

export async function getGlobalAuditLog(params: GlobalAuditLogParams): Promise<AuditLogResult> {
    const { page, pageSize, dateFrom, dateTo, adminId, action, search, sortBy, sortOrder } = params;

    // Search Pre-lookup
    let searchFilterString = '';

    if (search && search.trim() !== '') {
        const term = search.trim();
        const searchConditions = [];

        // 1. Search in reason (direct column)
        searchConditions.push(`reason.ilike.%${term}%`);

        // 2. Search in Admin Name/Email (related)
        const { data: matchingAdmins } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

        if (matchingAdmins && matchingAdmins.length > 0) {
            const adminIds = matchingAdmins.map(a => a.id).join(',');
            searchConditions.push(`admin_id.in.(${adminIds})`);
        }

        // 3. Search in Business Name (related)
        const { data: matchingBusinesses } = await supabase
            .from('businesses')
            .select('id')
            .ilike('business_name', `%${term}%`);

        if (matchingBusinesses && matchingBusinesses.length > 0) {
            const bizIds = matchingBusinesses.map(b => b.id).join(',');
            searchConditions.push(`business_id.in.(${bizIds})`);
        }

        if (searchConditions.length > 0) {
            searchFilterString = searchConditions.join(',');
        }
    }

    let query = supabase
        .from('admin_business_actions')
        .select('id, action, reason, changes_json, created_at, admin_id, business_id', { count: 'exact' });

    // Apply Search Filter
    if (searchFilterString) {
        query = query.or(searchFilterString);
    }

    // Apply Order
    const orderKey = sortBy || 'created_at';
    const orderAsc = sortOrder === 'asc';
    query = query.order(orderKey, { ascending: orderAsc });

    // Apply filters
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);
    if (adminId && adminId !== 'all') query = query.eq('admin_id', adminId);
    if (action && action !== 'all') query = query.eq('action', action);

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: logsData, count, error } = await query;

    if (error) throw error;
    if (!logsData || logsData.length === 0) {
        return {
            logs: [],
            totalCount: 0,
            page,
            pageSize,
            totalPages: 0
        };
    }

    // Manual Join: Fetch Admins
    const adminIds = [...new Set(logsData.map(l => l.admin_id).filter(Boolean))];
    let adminsMap: Record<string, { full_name: string, email: string }> = {};
    if (adminIds.length > 0) {
        const { data: admins } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', adminIds);
        admins?.forEach(a => {
            adminsMap[a.id] = { full_name: a.full_name, email: a.email };
        });
    }

    // Manual Join: Fetch Businesses
    const businessIds = [...new Set(logsData.map(l => l.business_id).filter(Boolean))];
    let businessesMap: Record<string, { id: string, business_name: string }> = {};
    if (businessIds.length > 0) {
        const { data: businesses } = await supabase
            .from('businesses')
            .select('id, business_name')
            .in('id', businessIds);
        businesses?.forEach(b => {
            businessesMap[b.id] = { id: b.id, business_name: b.business_name };
        });
    }

    // Merge Data
    // Merge Data
    const logs = logsData.map((item: any) => {
        let businessName = 'Deleted/Unknown';

        // Try to identify business name
        if (businessesMap[item.business_id]) {
            businessName = businessesMap[item.business_id].business_name;
        } else if (item.changes_json?.snapshot?.business_name) {
            // Fallback to snapshot if available (for hard deletes)
            businessName = `${item.changes_json.snapshot.business_name} (Deleted)`;
        }

        return {
            ...item,
            admin: adminsMap[item.admin_id] || { full_name: 'Unknown System', email: '' },
            business: businessesMap[item.business_id] || { id: item.business_id, business_name: businessName }
        };
    });

    return {
        logs: logs as AdminAuditLogEntry[],
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}

export async function getAllAdmins() {
    // Fetch unique admins who have performed actions
    const { data, error } = await supabase
        .from('admin_business_actions')
        .select('admin_id')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique IDs
    const adminIds = [...new Set(data?.map(d => d.admin_id))];

    if (adminIds.length === 0) return [];

    // Fetch details
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds);

    if (profileError) throw profileError;

    return profiles || [];
}

// Function to get hard-deleted businesses from audit logs
export interface HardDeletedBusiness {
    id: string;
    business_name: string;
    business_email: string | null;
    business_phone: string | null;
    city: string;
    business_type: string;
    owner_name: string;
    owner_email: string;
    deleted_at: string;
    deleted_by: string;
    reason: string;
}

export interface HardDeletedBusinessListResult {
    businesses: HardDeletedBusiness[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function getHardDeletedBusinesses(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<HardDeletedBusinessListResult> {
    const { page, pageSize, search, sortBy = 'created_at', sortOrder = 'desc' } = params;

    // Query audit logs for hard_delete actions
    let query = supabase
        .from('admin_business_actions')
        .select('id, business_id, admin_id, reason, changes_json, created_at', { count: 'exact' })
        .eq('action', 'hard_delete')
        .order(sortBy === 'created_at' ? 'created_at' : 'created_at', { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: logsData, count, error } = await query;

    if (error) throw error;
    if (!logsData || logsData.length === 0) {
        return {
            businesses: [],
            totalCount: 0,
            page,
            pageSize,
            totalPages: 0
        };
    }

    // Get admin names for the deletions
    const adminIds = [...new Set(logsData.map(l => l.admin_id).filter(Boolean))];
    let adminsMap: Record<string, string> = {};
    if (adminIds.length > 0) {
        const { data: admins } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', adminIds);
        admins?.forEach(a => {
            adminsMap[a.id] = a.full_name;
        });
    }

    // Transform audit logs to business-like objects
    let businesses: HardDeletedBusiness[] = logsData.map(log => {
        const snapshot = log.changes_json?.snapshot || {};
        return {
            id: log.business_id,
            business_name: snapshot.business_name || 'Unknown',
            business_email: snapshot.email || null,
            business_phone: snapshot.phone || null,
            city: snapshot.city || '',
            business_type: snapshot.type || '',
            owner_name: snapshot.owner_name || '',
            owner_email: snapshot.owner_email || '',
            deleted_at: log.created_at,
            deleted_by: adminsMap[log.admin_id] || 'Unknown',
            reason: log.reason || ''
        };
    });

    // Apply search filter client-side (since data is from snapshots)
    if (search) {
        const searchLower = search.toLowerCase();
        businesses = businesses.filter(b =>
            b.business_name.toLowerCase().includes(searchLower) ||
            (b.business_email && b.business_email.toLowerCase().includes(searchLower)) ||
            (b.city && b.city.toLowerCase().includes(searchLower)) ||
            (b.owner_name && b.owner_name.toLowerCase().includes(searchLower))
        );
    }

    return {
        businesses,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}
