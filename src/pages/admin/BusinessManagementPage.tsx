import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BusinessStatsCards } from '@/components/admin/business-management/BusinessStatsCards';
import { BusinessFilterBar } from '@/components/admin/business-management/BusinessFilterBar';
import { BusinessListTable } from '@/components/admin/business-management/BusinessListTable';
import { BusinessPagination } from '@/components/admin/business-management/BusinessPagination';
import { BusinessDetailModal } from '@/components/admin/business-management/BusinessDetailModal';
import { ApproveBusinessDialog } from '@/components/admin/business-management/ApproveBusinessDialog';
import { RejectBusinessDialog } from '@/components/admin/business-management/RejectBusinessDialog';
import { useAdminBusinessList, useBusinessStats } from '@/hooks/useAdminBusinessList';
import { AdminBusinessView } from '@/services/adminBusinessService';
// using local useEffect for debounce
// Since I don't see useDebounce in the list_dir earlier, I'll rely on the requirements "300ms delay" by using a local useEffect or simple timeout.
// But actually, I'll prefer implementing a simple debounce inside the component to avoid adding deps if not present.

const TABS = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'deleted', label: 'Deleted' },
    { value: 'all', label: 'All' },
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
    });

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
    const [viewBusinessId, setViewBusinessId] = useState<string | null>(null);
    const [approveBusiness, setApproveBusiness] = useState<AdminBusinessView | null>(null);
    const [rejectBusiness, setRejectBusiness] = useState<AdminBusinessView | null>(null);

    const handleActionComplete = () => {
        refetch(); // Refresh list stats also likely auto-refresh via React Query invalidation if configured, but explicit refetch ensures UI update
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
                        <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-4 py-2">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-6 space-y-6">
                    {/* Filter Bar */}
                    <BusinessFilterBar
                        filters={filters}
                        onFilterChange={handleFilterChange}
                    />

                    {/* Business Table */}
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
                    />

                    {/* Pagination */}
                    {listResult && (
                        <BusinessPagination
                            page={page}
                            pageSize={pageSize}
                            totalCount={listResult.totalCount}
                            totalPages={listResult.totalPages}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                        />
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
        </div>
    );
}
