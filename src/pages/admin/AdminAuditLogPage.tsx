import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    getGlobalAuditLog,
    getAllAdmins,
    GlobalAuditLogParams
} from "@/services/adminBusinessService";
import { AuditLogFilters } from "@/components/admin/audit/AuditLogFilters";
import { AuditLogTable } from "@/components/admin/audit/AuditLogTable";
import { useAuthStore } from "@/store/authStore";

import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminAuditLogPage() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [searchDebounce, setSearchDebounce] = useState('');
    const [searchFilters, setSearchFilters] = useState({
        dateFrom: '',
        dateTo: '',
        adminId: 'all',
        action: 'all',
        search: ''
    });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounce(searchFilters.search);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchFilters.search]);

    // Check access
    useEffect(() => {
        if (profile) {
            const hasAccess = profile.role === 'admin' || (profile as any).is_admin === true;
            if (!hasAccess) navigate('/dashboard');
        }
    }, [profile, navigate]);

    // Real-time Listener
    useEffect(() => {
        const channel = supabase
            .channel('public:admin_business_actions')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_business_actions'
                },
                () => {
                    // Invalidate query to refetch data
                    queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // Fetch Logs
    // Note: We only pass server-side sort keys to the API
    const serverSortKey = ['admin', 'business'].includes(sortConfig.key) ? 'created_at' : sortConfig.key;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-audit-log', page, pageSize, searchFilters.dateFrom, searchFilters.dateTo, searchFilters.adminId, searchFilters.action, searchDebounce, serverSortKey, sortConfig.direction],
        queryFn: () => getGlobalAuditLog({
            page,
            pageSize,
            ...searchFilters,
            search: searchDebounce,
            adminId: searchFilters.adminId === 'all' ? undefined : searchFilters.adminId,
            action: searchFilters.action === 'all' ? undefined : searchFilters.action,
            sortBy: serverSortKey as any,
            sortOrder: sortConfig.direction
        }),
        placeholderData: (previousData) => previousData
    });

    // Client-side sorting for joined columns (admin, business)
    const sortedLogs = [...(data?.logs || [])].sort((a, b) => {
        if (sortConfig.key === 'admin') {
            const nameA = a.admin.full_name.toLowerCase();
            const nameB = b.admin.full_name.toLowerCase();
            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        if (sortConfig.key === 'business') {
            const nameA = a.business.business_name.toLowerCase();
            const nameB = b.business.business_name.toLowerCase();
            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        return 0; // Default or already server-sorted
    });

    // Fetch Admin List for Filters
    const { data: adminList } = useQuery({
        queryKey: ['admin-list'],
        queryFn: getAllAdmins,
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    const handleFilterChange = (key: string, value: string) => {
        setSearchFilters(prev => ({ ...prev, [key]: value }));
        if (key !== 'search') {
            setPage(1); // Reset to first page on filter change (except typing search, which debounces)
        } else {
            // For search, we wait for debounce to trigger usage, but we can reset page when debounce updates
        }
    };

    // Reset page when actual search term changes
    useEffect(() => {
        setPage(1);
    }, [searchDebounce]);


    const handleReset = () => {
        setSearchFilters({
            dateFrom: '',
            dateTo: '',
            adminId: 'all',
            action: 'all',
            search: ''
        });
        setPage(1);
    };

    const handleExport = () => {
        // Placeholder for export functionality
        console.log("Exporting CSV...");
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin"
                            className="hover:bg-white rounded-full p-2 inline-flex items-center justify-center transition-colors"
                        >
                            <ArrowLeft className="text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <ShieldAlert className="text-indigo-600" />
                                Global Audit Log
                            </h1>
                            <p className="text-sm text-gray-500">Track all administrative actions across the platform</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleExport} disabled={isLoading}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <AuditLogFilters
                    filters={searchFilters}
                    onFilterChange={handleFilterChange}
                    onReset={handleReset}
                    admins={adminList || []}
                />

                {/* Table */}
                <AuditLogTable
                    logs={sortedLogs}
                    loading={isLoading}
                    sortConfig={sortConfig}
                    onSort={(key) => {
                        setSortConfig(current => ({
                            key,
                            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
                        }));
                    }}
                />

                {/* Pagination Controls */}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                                disabled={page === data.totalPages || isLoading}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{data.totalPages}</span>
                                    {' '}({data.totalCount} total entries)
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoading}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                                    disabled={page === data.totalPages || isLoading}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
