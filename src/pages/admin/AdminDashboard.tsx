import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, ShieldAlert } from 'lucide-react';
import ApiUsageWidget from '../../components/admin/ApiUsageWidget';
import { RetentionMonitor } from '../../components/admin/RetentionMonitor';
import { BusinessActivationWidget } from '../../components/admin/BusinessActivationWidget';
import { AdminSettingsWidget } from '../../components/admin/AdminSettingsWidget';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { profile, loading } = useAuthStore();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (profile) {
            // Check for admin role or is_admin flag
            const hasAdminAccess = profile.role === 'admin' || (profile as any).is_admin === true;
            setIsAdmin(hasAdminAccess);
        }
    }, [profile]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="mx-auto bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert size={32} className="text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-6">
                        You do not have permission to access the System Administration dashboard.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                            title="Back to App Dashboard"
                        >
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                <LayoutDashboard size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Business Management Section - New */}
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">Business Management</h2>
                            <BusinessActivationWidget />
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">API & Infrastructure</h2>
                            <ApiUsageWidget />
                        </section>
                    </div>

                    {/* Data Maintenance Section */}
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">Platform Settings</h2>
                            <AdminSettingsWidget />
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">Data Retention</h2>
                            <RetentionMonitor />
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
