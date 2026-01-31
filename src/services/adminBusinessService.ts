import { supabase } from '@/lib/supabase';

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
            .select(`
                id,
            action,
            reason,
            created_at,
            admin: admin_id(
                full_name,
                email
            )
            `)
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

    return {
        actions: actionsResult.data,
        statusHistory: statusResult.data
    };
}

export async function deleteBusiness(businessId: string, reason: string = 'Deleted by admin'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('admin_soft_delete_business', {
        p_business_id: businessId,
        p_admin_id: user.id,
        p_reason: reason
    });

    if (error) throw error;
}
