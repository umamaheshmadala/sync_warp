import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Building2,
    PenSquare,
    Server,
    BarChart3,
    ShieldAlert,
    FileText,
    Activity,
    Settings,
    ArrowLeft
} from 'lucide-react';

export function AdminSidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { id: 'summary', label: 'Summary', icon: LayoutDashboard, path: '/admin' },
        { id: 'moderation', label: 'Review Moderation', icon: FileText, path: '/admin/moderation' },
        { id: 'user-driver', label: 'User & Driver Management', icon: Users, path: '/admin/users' },
        { id: 'business', label: 'Business Management', icon: Building2, path: '/admin/businesses' },
        { id: 'business-edits', label: 'Business Edits', icon: PenSquare, path: '/admin/business-edits' },
        { id: 'api', label: 'API & Infrastructure', icon: Server, path: '/admin/api' },
        { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3, path: '/admin/analytics/reviews' },
        { id: 'security', label: 'Security & Compliance', icon: ShieldAlert, path: '/admin/audit-log' },
        { id: 'settings', label: 'Platform Settings', icon: Settings, path: '/admin/settings' },
        { id: 'retention', label: 'Data Retention Monitor', icon: Activity, path: '/admin/retention' }
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-20 shadow-sm h-screen sticky top-0">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                    <LayoutDashboard size={20} />
                </div>
                <div>
                    <h1 className="text-base font-bold text-gray-900 leading-tight">Admin Console</h1>
                    <p className="text-xs text-gray-500">System Administration</p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all group text-left ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                        >
                            <item.icon
                                size={18}
                                className={`transition-colors ${isActive
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 group-hover:text-indigo-600'
                                    }`}
                            />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to App
                </button>
            </div>
        </aside>
    );
}
