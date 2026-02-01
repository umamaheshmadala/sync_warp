
import React from 'react';
import { AdminSettingsWidget } from '../../components/admin/AdminSettingsWidget';

export default function PlatformSettingsPage() {
    return (
        <div className="min-w-0 max-w-full px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
                <p className="text-gray-500 mt-1">Configure global system settings and preferences.</p>
            </div>

            <div className="max-w-4xl">
                <AdminSettingsWidget />
            </div>
        </div>
    );
}
