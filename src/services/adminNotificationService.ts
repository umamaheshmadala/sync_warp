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
