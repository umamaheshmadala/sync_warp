export type AdminBusinessActionType =
    | 'approve'
    | 'reject'
    | 'edit'
    | 'soft_delete'
    | 'hard_delete'
    | 'restore'
    | 'view';

export interface AdminBusinessAction {
    id: string;
    business_id: string;
    admin_id: string;
    action: AdminBusinessActionType;
    reason?: string;
    changes_json?: any; // JSONB
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface BusinessStatusHistory {
    id: string;
    business_id: string;
    previous_status?: string;
    new_status: string;
    changed_by?: string;
    change_reason?: string;
    created_at: string;
}

export interface AdminBusinessFields {
    rejection_reason?: string;
    rejected_at?: string;
    rejected_by?: string;
    approved_at?: string;
    approved_by?: string;
    deleted_at?: string;
    deleted_by?: string;
    is_hard_deleted?: boolean;
    last_admin_action_at?: string;
}

// Extension of the core Business type (assumes you have a Business type elsewhere, 
// but defining the shape here for admin usage reference)
export interface AdminExtendedBusiness {
    // ... basic business fields
    id: string;
    business_name: string;
    status: 'pending' | 'active' | 'suspended' | 'inactive' | 'rejected' | 'deleted';

    // Admin fields
    rejection_reason?: string;
    rejected_at?: string;
    rejected_by?: string;
    approved_at?: string;
    approved_by?: string;
    deleted_at?: string;
    deleted_by?: string;
    is_hard_deleted?: boolean;
    last_admin_action_at?: string;
}
