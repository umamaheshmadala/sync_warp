
import React from 'react';
import ApiUsageWidget from '../../components/admin/ApiUsageWidget';

export default function ApiInfrastructurePage() {
    return (
        <div className="min-w-0 max-w-full px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">API & Infrastructure</h1>
                <p className="text-gray-500 mt-1">Monitor API usage, limits, and system health.</p>
            </div>

            <div className="max-w-4xl">
                <ApiUsageWidget />
            </div>
        </div>
    );
}
