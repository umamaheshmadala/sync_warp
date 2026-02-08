import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BusinessStatsCards } from '@/components/admin/business-management/BusinessStatsCards';
import { BusinessFilterBar } from '@/components/admin/business-management/BusinessFilterBar';
import { BusinessListTable } from '@/components/admin/business-management/BusinessListTable';
import { HardDeletedBusinessTable } from '@/components/admin/business-management/HardDeletedBusinessTable';
import { BusinessPagination } from '@/components/admin/business-management/BusinessPagination';
import { BusinessDetailModal } from '@/components/admin/business-management/BusinessDetailModal';
import { ApproveBusinessDialog } from '@/components/admin/business-management/ApproveBusinessDialog';
import { RejectBusinessDialog } from '@/components/admin/business-management/RejectBusinessDialog';
import { EditBusinessModal } from '@/components/admin/business-management/EditBusinessModal';
import { RestoreBusinessDialog } from '@/components/admin/business-management/RestoreBusinessDialog';
import { SoftDeleteBusinessDialog } from '@/components/admin/business-management/SoftDeleteBusinessDialog';
import { HardDeleteDialog } from '@/components/admin/business-management/HardDeleteDialog';
import { useAdminBusinessList, useBusinessStats, useHardDeletedBusinesses } from '@/hooks/useAdminBusinessList';
import { adminPendingEditsService } from '@/services/adminPendingEditsService';
import { PendingEditsTab } from '@/components/admin/business-management/PendingEditsTab';
import { useQuery } from '@tanstack/react-query';
import { AdminBusinessView, deleteBusiness } from '@/services/adminBusinessService';
import { toast } from 'react-hot-toast';

// using local useEffect for debounce
// Since I don't see useDebounce in the list_dir earlier, I'll rely on the requirements "300ms delay" by using a local useEffect or simple timeout.
// But actually, I'll prefer implementing a simple debounce inside the component to avoid adding deps if not present.

const TABS = [
    { value: 'all', label: 'All' },
    { value: 'pending_approvals', label: 'New Approvals' }, // Renamed from 'pending' to avoid confusion, but keeping value 'pending' implies legacy. 
    // Wait, if I change value 'pending' -> 'pending_approvals', I break existing URLs. 
    // The requirement says "New tab: Pending Edits". The existing "Pending" tab is for business status 'pending'.
    // Let's keep 'pending' value but rename label to 'New Approvals' or 'Pending Listings' to distinguish.
    { value: 'pending', label: 'New Listings' },
    { value: 'pending_edits', label: 'Pending Edits' },
    { value: 'active', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'deleted', label: 'Deleted (Soft)' },
    { value: 'hard_deleted', label: 'Deleted (Hard)' },
];

export default function BusinessManagementPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // State from URL or defaults
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [pageSize, setPageSize] = useState(parseInt(searchParams.get('size') || '50'));
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
        (searchParams.get('order') as 'asc' | 'desc') || 'desc'
    );

    const [filters, setFilters] = useState({
        city: searchParams.get('city') || '',
        category: searchParams.get('category') || '',
        dateFrom: searchParams.get('dateFrom') || '',
        dateTo: searchParams.get('dateTo') || '',
        year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
        month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
        search: searchParams.get('search') || '',
    });

    // Debounced search term
    const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 300);
        return () => clearTimeout(handler);
    }, [filters.search]);

    // Queries
    const { data: stats } = useBusinessStats();
    const { data: listResult, isLoading, refetch } = useAdminBusinessList({
        filters: { ...filters, search: debouncedSearch, status: activeTab },
        page,
        pageSize,
        sortBy,
        sortOrder,
        enabled: activeTab !== 'hard_deleted' && activeTab !== 'pending_edits',
    });

    // Hard-deleted businesses query (only fetch when on that tab)
    const { data: hardDeletedResult, isLoading: isLoadingHardDeleted } = useHardDeletedBusinesses({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortOrder,
        enabled: activeTab === 'hard_deleted',
    });

    // Pending Edits Count Query for Badge
    const { data: pendingEditsList } = useQuery({
        queryKey: ['admin-pending-edits-count'],
        queryFn: adminPendingEditsService.getPendingEditsList,
        // Refresh every minute roughly
        staleTime: 60 * 1000
    });
    const pendingEditsCount = pendingEditsList?.length || 0;

    // Update URL when state changes
    useEffect(() => {
        const params = new URLSearchParams();
        params.set('tab', activeTab);
        params.set('page', String(page));
        params.set('size', String(pageSize));
        params.set('sort', sortBy);
        params.set('order', sortOrder);

        if (filters.city) params.set('city', filters.city);
        if (filters.category) params.set('category', filters.category);
        if (filters.search) params.set('search', filters.search);
        if (filters.year) params.set('year', String(filters.year));
        if (filters.month) params.set('month', String(filters.month));

        setSearchParams(params, { replace: true });
    }, [activeTab, page, pageSize, sortBy, sortOrder, filters, setSearchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setPage(1); // Reset page on tab change
        // Also reset sort if moving to 'pending' to FIFO as per spec?
        // Spec: "Pending tab default sort: Oldest First (FIFO)"
        if (value === 'pending') {
            setSortBy('created_at');
            setSortOrder('asc');
        } else {
            // Default for others logic if needed, but retaining previous or default is fine
        }
    };

    const handleFilterChange = (newFilters: typeof filters) => {
        setFilters(newFilters);
        setPage(1); // Reset page on filter change
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };


    // Modal State
    const [viewBusinessId, setViewBusinessId] = useState<string | null>(searchParams.get('businessId') || null);

    // Sync URL with modal state
    useEffect(() => {
        const currentBusinessId = searchParams.get('businessId');
        if (viewBusinessId && currentBusinessId !== viewBusinessId) {
            setSearchParams(prev => {
                prev.set('businessId', viewBusinessId);
                return prev;
            }, { replace: true });
        } else if (!viewBusinessId && currentBusinessId) {
            setSearchParams(prev => {
                prev.delete('businessId');
                return prev;
            }, { replace: true });
        }
    }, [viewBusinessId, searchParams, setSearchParams]);

    // Also watch for URL changes to open modal if navigated to (e.g. back button or initial load)
    useEffect(() => {
        const businessIdFromUrl = searchParams.get('businessId');
        if (businessIdFromUrl && businessIdFromUrl !== viewBusinessId) {
            setViewBusinessId(businessIdFromUrl);
        } else if (!businessIdFromUrl && viewBusinessId) {
            setViewBusinessId(null);
        }
    }, [searchParams]);

    const [approveBusiness, setApproveBusiness] = useState<AdminBusinessView | null>(null);
    const [rejectBusiness, setRejectBusiness] = useState<AdminBusinessView | null>(null);
    const [editBusiness, setEditBusiness] = useState<AdminBusinessView | null>(null);
    const [restoreBusiness, setRestoreBusiness] = useState<AdminBusinessView | null>(null);
    const [softDeleteBusiness, setSoftDeleteBusiness] = useState<AdminBusinessView | null>(null);
    const [hardDeleteBusiness, setHardDeleteBusiness] = useState<AdminBusinessView | null>(null);

    const queryClient = useQueryClient();

    const handleActionComplete = () => {
        // Invalidate all business list queries to ensure counts and other tabs are updated
        queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
        queryClient.invalidateQueries({ queryKey: ['admin-business-stats'] });
        // Also invalidate details and audit logs in case the detail modal is open or re-opened
        queryClient.invalidateQueries({ queryKey: ['admin-business-details'] });
        queryClient.invalidateQueries({ queryKey: ['admin-business-audit'] });
    };



    return (
        <div className="container py-6 space-y-6 max-w-[1400px]">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Business Management</h1>
            </div>

            {/* Statistics Cards */}
            <BusinessStatsCards stats={stats} onCardClick={handleTabChange} />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-gray-100/50">
                    {TABS.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-4 py-2 relative">
                            {tab.label}
                            {tab.value === 'pending_edits' && pendingEditsCount > 0 && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 ml-2 h-5 flex items-center justify-center px-1.5 min-w-[1.25rem]">
                                    {pendingEditsCount}
                                </Badge>
                            )}
                            {tab.value === 'pending' && stats?.pending > 0 && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 ml-2 h-5 flex items-center justify-center px-1.5 min-w-[1.25rem]">
                                    {stats.pending}
                                </Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-6 space-y-6">
                    {/* Filter Bar - only show for non-hard-deleted tabs */}
                    {activeTab !== 'hard_deleted' && (
                        <BusinessFilterBar
                            filters={filters}
                            onFilterChange={handleFilterChange}
                        />
                    )}

                    {/* Business Table - conditionally render based on tab */}
                    {activeTab === 'hard_deleted' ? (
                        <HardDeletedBusinessTable
                            businesses={hardDeletedResult?.businesses || []}
                            isLoading={isLoadingHardDeleted}
                        />
                    ) : activeTab === 'pending_edits' ? (
                        <PendingEditsTab />
                    ) : (
                        <BusinessListTable
                            businesses={listResult?.businesses || []}
                            isLoading={isLoading}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            onRefresh={refetch}
                            onView={setViewBusinessId}
                            onApprove={setApproveBusiness}
                            onReject={setRejectBusiness}
                            onEdit={setEditBusiness}
                            onSoftDelete={setSoftDeleteBusiness}
                            onRestore={setRestoreBusiness}
                            onHardDelete={setHardDeleteBusiness}
                        />
                    )}

                    {/* Pagination */}
                    {activeTab === 'hard_deleted' ? (
                        hardDeletedResult && hardDeletedResult.totalCount > 0 && (
                            <BusinessPagination
                                page={page}
                                pageSize={pageSize}
                                totalCount={hardDeletedResult.totalCount}
                                totalPages={hardDeletedResult.totalPages}
                                onPageChange={setPage}
                                onPageSizeChange={setPageSize}
                            />
                        )
                    ) : (
                        listResult && (
                            <BusinessPagination
                                page={page}
                                pageSize={pageSize}
                                totalCount={listResult.totalCount}
                                totalPages={listResult.totalPages}
                                onPageChange={setPage}
                                onPageSizeChange={setPageSize}
                            />
                        )
                    )}
                </div>
            </Tabs>

            {/* Modals */}
            <BusinessDetailModal
                businessId={viewBusinessId}
                onClose={() => setViewBusinessId(null)}
                onActionComplete={handleActionComplete}
            />

            <ApproveBusinessDialog
                business={approveBusiness}
                isOpen={!!approveBusiness}
                onClose={() => setApproveBusiness(null)}
                onSuccess={() => {
                    setApproveBusiness(null);
                    handleActionComplete();
                }}
            />

            <RejectBusinessDialog
                business={rejectBusiness}
                isOpen={!!rejectBusiness}
                onClose={() => setRejectBusiness(null)}
                onSuccess={() => {
                    setRejectBusiness(null);
                    handleActionComplete();
                }}
            />

            <EditBusinessModal
                business={editBusiness as any}
                isOpen={!!editBusiness}
                onClose={() => setEditBusiness(null)}
                onSuccess={() => {
                    setEditBusiness(null);
                    handleActionComplete();
                }}
            />

            <RestoreBusinessDialog
                business={restoreBusiness}
                isOpen={!!restoreBusiness}
                onClose={() => setRestoreBusiness(null)}
                onSuccess={() => {
                    setRestoreBusiness(null);
                    handleActionComplete();
                }}
            />

            <SoftDeleteBusinessDialog
                business={softDeleteBusiness}
                isOpen={!!softDeleteBusiness}
                onClose={() => setSoftDeleteBusiness(null)}
                onSuccess={() => {
                    setSoftDeleteBusiness(null);
                    handleActionComplete();
                }}
            />

            <HardDeleteDialog
                business={hardDeleteBusiness}
                isOpen={!!hardDeleteBusiness}
                onClose={() => setHardDeleteBusiness(null)}
                onSuccess={() => {
                    setHardDeleteBusiness(null);
                    handleActionComplete();
                }}
            />
        </div>
    );
}
