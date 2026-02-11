
import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AdminSidebar } from '../admin/AdminSidebar';
import { useAuthStore } from '../../store/authStore';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout() {
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
                    <Link
                        to="/dashboard"
                        className="w-full block text-center bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
