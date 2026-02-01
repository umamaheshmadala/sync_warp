
import React from 'react';
import { RetentionMonitor } from '../../components/admin/RetentionMonitor';

export default function DataRetentionPage() {
    return (
        <div className="min-w-0 max-w-full px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Data Retention Monitor</h1>
                <p className="text-gray-500 mt-1">Monitor and manage data retention policies and cleanup tasks.</p>
            </div>

            <div className="max-w-4xl">
                <RetentionMonitor />
            </div>
        </div>
    );
}
