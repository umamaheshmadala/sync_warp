import { supabase } from '@/lib/supabase';

export async function sendBusinessApprovalNotification(businessId: string): Promise<void> {
    // Get business and owner details
    const { data: business } = await supabase
        .from('businesses')
        .select('business_name, user_id')
        .eq('id', businessId)
        .single();

    if (!business) return;

    const { data: { user } } = await supabase.auth.getUser();

    // Insert notification
    const { error } = await supabase.from('notification_log').insert({
        user_id: business.user_id,
        notification_type: 'business_approved',
        title: 'Your business has been approved! 🎉',
        body: `Great news! ${business.business_name} is now live and visible to customers.`,
        data: {
            business_id: businessId,
            business_name: business.business_name,
            sender_id: user?.id
        },
        opened: false,
        platform: 'web',
        sender_id: user?.id
    });

    if (error) {
        console.error('Error sending approval notification:', error);
    }
}

export async function sendBusinessRejectionNotification(
    businessId: string,
    reason: string
): Promise<void> {
    const { data: business } = await supabase
        .from('businesses')
        .select('business_name, user_id')
        .eq('id', businessId)
        .single();

    if (!business) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('notification_log').insert({
        user_id: business.user_id,
        notification_type: 'business_rejected',
        title: 'Action required for your business listing',
        body: `Your listing for ${business.business_name} needs attention. Reason: ${reason}`,
        data: {
            business_id: businessId,
            business_name: business.business_name,
            reason: reason,
            sender_id: user?.id
        },
        opened: false,
        platform: 'web',
        sender_id: user?.id
    });

    if (error) {
        console.error('Error sending rejection notification:', error);
    }
}

export async function notifyOwnerOfEditDecision(
    businessId: string,
    decision: 'approved' | 'rejected' | 'partial',
    details?: { reason?: string; approvedFields?: string[]; rejectedFields?: string[] }
): Promise<void> {
    const { data: business } = await supabase
        .from('businesses')
        .select('business_name, user_id')
        .eq('id', businessId)
        .single();

    if (!business) return;

    const { data: { user } } = await supabase.auth.getUser();

    let title = '';
    let body = '';
    let type = 'business_edit_decision';

    switch (decision) {
        case 'approved':
            title = 'Your business updates have been approved! 🎉';
            body = `The changes you submitted for ${business.business_name} are now live.`;
            break;
        case 'rejected':
            title = 'Update request for your business was not approved';
            body = `Your changes for ${business.business_name} could not be approved. Reason: ${details?.reason || 'No reason provided'}`;
            break;
        case 'partial':
            const approved = details?.approvedFields?.length || 0;
            const rejected = details?.rejectedFields?.length || 0;
            title = 'Update request partially approved';
            body = `We approved ${approved} change(s) for ${business.business_name}, but ${rejected} change(s) were not accepted. Check the app for details.`;
            break;
    }

    const { error } = await supabase.from('notification_log').insert({
        user_id: business.user_id,
        notification_type: type,
        title: title,
        body: body,
        data: {
            business_id: businessId,
            business_name: business.business_name,
            decision: decision,
            ...details,
            sender_id: user?.id
        },
        opened: false,
        platform: 'web',
        sender_id: user?.id
    });

    if (error) {
        console.error('Error sending edit decision notification:', error);
    }
}
