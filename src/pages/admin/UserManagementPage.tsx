
import React from 'react';
import { ReviewModerationWidget } from '../../components/admin/ReviewModerationWidget';
import { DriverScoreWidget } from '../../components/admin/DriverScoreWidget';

export default function UserManagementPage() {
    return (
        <div className="min-w-0 max-w-full px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">User & Driver Management</h1>
                <p className="text-gray-500 mt-1">Manage user reviews, driver scores, and moderation.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Review Moderation</h2>
                        <ReviewModerationWidget />
                    </section>
                </div>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Driver Performance</h2>
                        <DriverScoreWidget />
                    </section>
                </div>
            </div>
        </div>
    );
}
