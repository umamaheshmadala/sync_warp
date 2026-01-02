
import React from 'react';
import { RecentActivityFeed } from '../friends/RecentActivityFeed';
import UserReviewsList from '../reviews/UserReviewsList';
import { useAuthStore } from '@/store/authStore';

export const MyActivityTab: React.FC = () => {
    const { user } = useAuthStore();

    if (!user) return null;

    return (
        <div className="space-y-8">
            {/* 1. Recent Activity Feed */}
            <section>
                <RecentActivityFeed userId={user.id} />
            </section>

            {/* 2. My Reviews Section */}
            <section>
                <UserReviewsList />
            </section>
        </div>
    );
};
