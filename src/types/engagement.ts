export interface EngagementEvent {
    event_id: string;
    event_type: 'share' | 'checkin' | 'review' | 'redemption' | 'favorite_offer' | 'favorite_product' | 'favorite';
    user_id: string;
    user_name: string;
    user_avatar: string;
    details: string;
    metadata: any;
    created_at: string;
}
