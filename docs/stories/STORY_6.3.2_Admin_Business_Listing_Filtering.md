# Story 6.3.2: Admin Business Management - Listing & Filtering UI

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** Story 6.3.1 (Database Schema)  
**Status:** Completed

---

## Overview

Build the admin business management dashboard with a comprehensive listing view, advanced filtering capabilities, real-time search, and tab-based navigation by status. This is the primary interface admins will use to view and manage all businesses on the platform.

Make sure to utilize the existing code to your advantage. Few of the features that are in the stories of EPIC 6.3 are fully or partially implemented. Make sure you utilize those codes, modules, or functionalities to your advantage. 
---

## Problem Statement

### Current State
- No centralized view of all businesses for admins
- No way to filter businesses by city, category, or registration date
- No search functionality for finding specific businesses
- No visibility into pending or rejected businesses

### Desired State
- Tab-based interface showing businesses by status
- Advanced filtering (city, category, date range, year, month)
- Real-time search by business name, email, phone, owner
- Pagination with configurable page size
- Multi-sort options

---

## User Stories

### US-6.3.2.1: Tab-Based Status Navigation
**As an** admin  
**I want to** see businesses organized by status tabs  
**So that** I can quickly access pending businesses for review

**Acceptance Criteria:**
- [ ] Tabs displayed: "Pending", "Approved", "Rejected", "Deleted", "All"
- [ ] Each tab shows count badge (e.g., "Pending (12)")
- [ ] Default tab is "Pending" when navigating to the page
- [ ] Tab selection persists in URL query param (`?tab=pending`)
- [ ] Switching tabs clears current filters and search
- [ ] Count badges update in real-time when actions are taken
- [ ] "All" tab shows all businesses regardless of status

---

### US-6.3.2.2: Business List Table
**As an** admin  
**I want to** see a comprehensive list of businesses in table format  
**So that** I can quickly scan and identify businesses to act on

**Acceptance Criteria:**
- [ ] Table columns:
  - Checkbox (for future selection, disabled for now per "no bulk ops" decision)
  - Business Name (clickable, opens detail modal)
  - Owner Name (with email hover tooltip)
  - City
  - Category (business_type)
  - Status badge (color-coded)
  - Registration Date (formatted: "Jan 15, 2026")
  - Actions (View, Approve, Reject, Edit, Delete icons)
- [ ] Business name links to detail modal (Story 6.3.3)
- [ ] Status badges color-coded:
  - Pending: Yellow/Orange
  - Active/Approved: Green
  - Rejected: Red
  - Deleted: Gray
  - Suspended: Orange
- [ ] Empty state shown when no businesses match current filters
- [ ] Loading skeleton while data is fetching

---

### US-6.3.2.3: Advanced Filtering System
**As an** admin  
**I want to** filter businesses by multiple criteria  
**So that** I can find specific subsets of businesses

**Acceptance Criteria:**
- [ ] Filter controls displayed above the table
- [ ] Available filters:
  - **City** (multi-select dropdown, searchable, populated from existing businesses)
  - **Category** (multi-select dropdown, populated from business_categories table)
  - **Registration Date Range** (date picker, from-to)
  - **Quick Date Presets** (Today, Yesterday, Last 7 Days, This Month, Last 30 Days, This Year)
  - **Year of Registration** (dropdown: 2024, 2025, 2026, etc.)
  - **Month of Registration** (dropdown: January-December)
- [ ] Multi-select filters show selected count badge (e.g., "Cities (3)")
- [ ] All filters are combinable (AND logic)
- [ ] Active filters displayed as chips below filter row
- [ ] Each chip has "X" to remove that filter
- [ ] "Clear All Filters" button visible when any filter is active
- [ ] Filter state persisted in URL query params
- [ ] Filters persist across tab switches within same session

---

### US-6.3.2.4: Real-Time Search
**As an** admin  
**I want to** search businesses by text  
**So that** I can quickly find a specific business

**Acceptance Criteria:**
- [ ] Search input field with magnifying glass icon
- [ ] Placeholder text: "Search by name, email, phone, or owner..."
- [ ] Debounced search (300ms delay after typing stops)
- [ ] Search queries these fields:
  - `businesses.business_name` (ILIKE)
  - `businesses.business_email` (ILIKE)
  - `businesses.business_phone` (ILIKE)
  - `profiles.full_name` (owner, via JOIN)
- [ ] Search results update table in real-time
- [ ] Search term highlighted in results (optional)
- [ ] "No results found" message when search yields nothing
- [ ] Clear search button ("X") inside input field

---

### US-6.3.2.5: Pagination
**As an** admin  
**I want to** navigate through large lists of businesses  
**So that** I can view all businesses without overwhelming the page

**Acceptance Criteria:**
- [ ] Default page size: 50 businesses
- [ ] Page size options: 20, 50, 100
- [ ] Page size selector dropdown
- [ ] **Page size preference saved to localStorage** and restored on next visit
- [ ] Pagination controls: "Previous", page numbers, "Next"
- [ ] Current page and total pages displayed ("Page 2 of 15")
- [ ] Total business count displayed ("Showing 51-100 of 742 businesses")
- [ ] Disabled "Previous" on first page, "Next" on last page
- [ ] Page resets to 1 when filters change

---

### US-6.3.2.6: Multi-Sort Options
**As an** admin  
**I want to** sort businesses by different columns  
**So that** I can organize the list as needed

**Acceptance Criteria:**
- [ ] Sortable columns (click header to sort):
  - Registration Date (newest first for most tabs)
  - Business Name (A-Z, Z-A)
  - City (A-Z, Z-A)
  - Category (A-Z, Z-A)
  - Status (Pending → Active → Rejected → Deleted)
  - Last Admin Action (most recent first)
- [ ] **Pending tab default sort: Oldest First (FIFO)** for fair queue processing
- [ ] Visual indicator (arrow) on sorted column
- [ ] Click again to toggle ascending/descending
- [ ] Sort persists across pagination
- [ ] Sort resets when tab changes

---

### US-6.3.2.7: Business Statistics Summary
**As an** admin  
**I want to** see summary statistics at a glance  
**So that** I know the overall state of businesses on the platform

**Acceptance Criteria:**
- [ ] Statistics cards displayed at top of page:
  - Total Businesses (all statuses)
  - Pending Approval (count)
  - Active Businesses (count)
  - Rejected This Month (count)
  - Deleted (soft-deleted count)
- [ ] Cards are clickable and apply corresponding tab filter
- [ ] Statistics update in real-time when actions are taken
- [ ] Trend indicators (optional): "↑ 5 from yesterday"

---

## Technical Requirements

### Component Structure

```
src/pages/admin/
└── BusinessManagementPage.tsx    # Main page component

src/components/admin/business-management/
├── BusinessManagementTabs.tsx    # Tab navigation
├── BusinessListTable.tsx         # Main table component
├── BusinessFilterBar.tsx         # Filter controls
├── BusinessSearchInput.tsx       # Search input
├── BusinessStatsCards.tsx        # Statistics summary
├── BusinessPagination.tsx        # Pagination controls
├── BusinessTableRow.tsx          # Individual row component
├── BusinessStatusBadge.tsx       # Status badge component
└── FilterChips.tsx               # Active filter chips
```

### Service Layer

**File:** `src/services/adminBusinessService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface BusinessListFilters {
  status?: string;
  city?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  year?: number;
  month?: number;
  search?: string;
}

export interface BusinessListParams {
  filters: BusinessListFilters;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface BusinessListResult {
  businesses: AdminBusinessView[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminBusinessView {
  id: string;
  business_name: string;
  business_type: string;
  business_email: string | null;
  business_phone: string | null;
  city: string;
  status: string;
  created_at: string;
  owner: {
    id: string;
    full_name: string;
    email: string;
  };
  approved_at: string | null;
  rejected_at: string | null;
  deleted_at: string | null;
  last_admin_action_at: string | null;
}

export async function getBusinessList(params: BusinessListParams): Promise<BusinessListResult> {
  const { filters, page, pageSize, sortBy, sortOrder } = params;
  
  let query = supabase
    .from('businesses')
    .select(`
      id,
      business_name,
      business_type,
      business_email,
      business_phone,
      city,
      status,
      created_at,
      approved_at,
      rejected_at,
      deleted_at,
      last_admin_action_at,
      owner:profiles!user_id (
        id,
        full_name,
        email
      )
    `, { count: 'exact' });
  
  // Status filter (from tab)
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  // City filter
  if (filters.city) {
    query = query.eq('city', filters.city);
  }
  
  // Category filter
  if (filters.category) {
    query = query.eq('business_type', filters.category);
  }
  
  // Date range filter
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }
  
  // Year filter
  if (filters.year) {
    const yearStart = `${filters.year}-01-01`;
    const yearEnd = `${filters.year}-12-31`;
    query = query.gte('created_at', yearStart).lte('created_at', yearEnd);
  }
  
  // Month filter (requires year)
  if (filters.month && filters.year) {
    const monthStart = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const monthEnd = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
    query = query.gte('created_at', monthStart).lte('created_at', monthEnd);
  }
  
  // Search filter (case-insensitive)
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`business_name.ilike.${searchTerm},business_email.ilike.${searchTerm},business_phone.ilike.${searchTerm}`);
    // Note: owner search requires client-side filtering or separate query
  }
  
  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    businesses: data as AdminBusinessView[],
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
}

export async function getBusinessStats(): Promise<{
  total: number;
  pending: number;
  active: number;
  rejected: number;
  deleted: number;
}> {
  const { data, error } = await supabase
    .from('businesses')
    .select('status', { count: 'exact' });
  
  if (error) throw error;
  
  const stats = {
    total: data?.length || 0,
    pending: 0,
    active: 0,
    rejected: 0,
    deleted: 0
  };
  
  data?.forEach(b => {
    switch (b.status) {
      case 'pending': stats.pending++; break;
      case 'active': stats.active++; break;
      case 'rejected': stats.rejected++; break;
      case 'deleted': stats.deleted++; break;
    }
  });
  
  return stats;
}

export async function getFilterOptions(): Promise<{
  cities: string[];
  categories: string[];
  years: number[];
}> {
  // Get distinct cities
  const { data: cityData } = await supabase
    .from('businesses')
    .select('city')
    .neq('city', null);
  
  const cities = [...new Set(cityData?.map(b => b.city).filter(Boolean))].sort();
  
  // Get categories from business_categories table
  const { data: catData } = await supabase
    .from('business_categories')
    .select('name, display_name')
    .eq('is_active', true)
    .order('sort_order');
  
  const categories = catData?.map(c => c.name) || [];
  
  // Get distinct years
  const { data: yearData } = await supabase
    .from('businesses')
    .select('created_at');
  
  const years = [...new Set(
    yearData?.map(b => new Date(b.created_at).getFullYear())
  )].sort((a, b) => b - a);
  
  return { cities, categories, years };
}
```

### React Query Hooks

**File:** `src/hooks/useAdminBusinessList.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessList, getBusinessStats, getFilterOptions, BusinessListParams } from '@/services/adminBusinessService';

export function useAdminBusinessList(params: BusinessListParams) {
  return useQuery({
    queryKey: ['admin-businesses', params],
    queryFn: () => getBusinessList(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useBusinessStats() {
  return useQuery({
    queryKey: ['admin-business-stats'],
    queryFn: getBusinessStats,
    staleTime: 60000, // 1 minute
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['admin-business-filter-options'],
    queryFn: getFilterOptions,
    staleTime: 300000, // 5 minutes
  });
}
```

### Main Page Component

**File:** `src/pages/admin/BusinessManagementPage.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BusinessStatsCards } from '@/components/admin/business-management/BusinessStatsCards';
import { BusinessFilterBar } from '@/components/admin/business-management/BusinessFilterBar';
import { BusinessListTable } from '@/components/admin/business-management/BusinessListTable';
import { BusinessPagination } from '@/components/admin/business-management/BusinessPagination';
import { useAdminBusinessList, useBusinessStats } from '@/hooks/useAdminBusinessList';

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
  
  // Queries
  const { data: stats } = useBusinessStats();
  const { data: listResult, isLoading, refetch } = useAdminBusinessList({
    filters: { ...filters, status: activeTab },
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
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    setSearchParams(params, { replace: true });
  }, [activeTab, page, filters]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1); // Reset page on tab change
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
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Business Management</h1>
      </div>
      
      {/* Statistics Cards */}
      <BusinessStatsCards stats={stats} onCardClick={setActiveTab} />
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              {tab.label}
              {stats && tab.value !== 'all' && (
                <Badge variant={tab.value === 'pending' ? 'destructive' : 'secondary'}>
                  {stats[tab.value as keyof typeof stats] || 0}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="mt-4 space-y-4">
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
    </div>
  );
}
```

---

## UI/UX Specifications

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Business Management                                              │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │  Total  │ │ Pending │ │ Active  │ │Rejected │ │ Deleted │    │
│ │   742   │ │   12    │ │   680   │ │   35    │ │   15    │    │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ [Pending (12)] [Approved] [Rejected] [Deleted] [All]            │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Search...     [City ▼] [Category ▼] [Date Range] [Year] [Mo] │
│ Active filters: [Mumbai ×] [Restaurant ×]        [Clear All]    │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ☐ │ Business Name ↓ │ Owner    │ City │ Cat │ Status │ ⚡ │  │
│ ├───────────────────────────────────────────────────────────┤  │
│ │ ☐ │ Pizza Palace    │ John Doe │ Mum  │ Rest│ 🟡 Pend│ ⋮ │  │
│ │ ☐ │ Tech Services   │ Jane S.  │ Del  │ Serv│ 🟢 Act │ ⋮ │  │
│ │ ☐ │ Fashion Hub     │ Mike T.  │ Bang │ Ret │ 🔴 Rej │ ⋮ │  │
│ │ ... more rows ...                                          │  │
│ └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Page size: [50 ▼]  ◀ Previous  1 2 3 ... 15  Next ▶             │
│ Showing 1-50 of 742 businesses                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Status Badge Colors

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Pending | `bg-yellow-100` | `text-yellow-800` | - |
| Active | `bg-green-100` | `text-green-800` | - |
| Rejected | `bg-red-100` | `text-red-800` | - |
| Deleted | `bg-gray-100` | `text-gray-600` | - |
| Suspended | `bg-orange-100` | `text-orange-800` | - |

---

## Testing Plan

### Manual Testing Checklist

#### Test Route 1: Basic Navigation
1. Login as admin (testuser1@gmail.com / Testuser@1)
2. Navigate to `/admin/businesses`
3. Verify default tab is "Pending"
4. Verify statistics cards show correct counts
5. Click each tab and verify counts match table

#### Test Route 2: Filtering
1. Select "City" filter → Choose "Mumbai"
2. Verify only Mumbai businesses shown
3. Add "Category" filter → Choose "Restaurant"
4. Verify both filters applied (AND logic)
5. Verify filter chips appear
6. Click "×" on chip → Filter removed
7. Click "Clear All" → All filters removed

#### Test Route 3: Search
1. Type "pizza" in search box
2. Wait 300ms for debounce
3. Verify results contain "pizza" in name, email, or phone
4. Clear search → All results return

#### Test Route 4: Pagination
1. Verify default page size is 50
2. Change to 20 → Table updates
3. Click "Next" → Page 2 loads
4. Click page number → Direct navigation
5. Verify "Previous" disabled on page 1

#### Test Route 5: Sorting
1. Click "Business Name" header
2. Verify sort indicator appears
3. Verify businesses sorted A-Z
4. Click again → Z-A sort
5. Click "Registration Date" → Sort changes

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing admin components in `src/components/admin/`
- [ ] Review existing table components in `src/components/ui/`
- [ ] Check existing filter patterns in the codebase
- [ ] Review existing Tabs usage patterns
- [ ] Verify react-query patterns used elsewhere

### 2. Database Migration Execution
- [ ] Ensure Story 6.3.1 migration has been applied
- [ ] Verify admin user has `is_admin = true` in profiles

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (screenshot, test result)
- [ ] Document any deviations or edge cases discovered

### 4. Browser Testing & Evidence Collection

**Test Environment:**
- Local dev server: `http://localhost:5173`
- Do NOT start the dev server (it's already running)

**Test Credentials:**
| User | Email | Password | Role |
|------|-------|----------|------|
| Admin User 1 | testuser1@gmail.com | Testuser@1 | Admin |
| Admin User 2 | testuser3@gmail.com | Testuser@1 | Admin (if configured) |

**Evidence Collection Requirements:**
- [ ] **Screenshot** the main page with all tabs visible
- [ ] **Screenshot** filtered results with active chips
- [ ] **Screenshot** search results
- [ ] **Screenshot** pagination controls
- [ ] **Record browser session** for filter/search flow

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/BusinessManagementPage.tsx` | CREATE | Main page component |
| `src/components/admin/business-management/BusinessStatsCards.tsx` | CREATE | Statistics cards |
| `src/components/admin/business-management/BusinessFilterBar.tsx` | CREATE | Filter controls |
| `src/components/admin/business-management/BusinessListTable.tsx` | CREATE | Table component |
| `src/components/admin/business-management/BusinessTableRow.tsx` | CREATE | Row component |
| `src/components/admin/business-management/BusinessPagination.tsx` | CREATE | Pagination |
| `src/components/admin/business-management/BusinessStatusBadge.tsx` | CREATE | Status badge |
| `src/services/adminBusinessService.ts` | CREATE | API service |
| `src/hooks/useAdminBusinessList.ts` | CREATE | React Query hooks |
| `src/router/Router.tsx` | MODIFY | Add route |

---

## Definition of Done

- [ ] Tab navigation works with count badges
- [ ] Table displays all business fields correctly
- [ ] All 5 filters work independently and combined
- [ ] Search queries name, email, phone, owner
- [ ] Pagination works with configurable page sizes
- [ ] Sorting works on all sortable columns
- [ ] Statistics cards display correct counts
- [ ] URL state persistence works
- [ ] Loading and empty states implemented
- [ ] All browser tests pass with evidence

---

## Dependencies

- **Requires:** Story 6.3.1 (Database Schema)
- **Blocks:** Story 6.3.3 (Approval/Rejection - needs table actions)
- **Related:** Story 6.3.4 (Editing), Story 6.3.5 (Audit Log)

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
