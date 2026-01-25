import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import {
    getPendingReviews,
    getPendingReviewCount,
    approveReview,
    getReviewsByIds,
    bulkRejectReviews,
    type PendingReview
} from '../../services/moderationService';
import { getPendingReports } from '../../services/reportService';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { ModerationStats } from '@/components/admin/ModerationStats';
import { ModerationQueue } from '@/components/admin/ModerationQueue';
import { ModerationAuditLog } from '@/components/admin/ModerationAuditLog';
import { ReviewDetailsModal } from '@/components/admin/ReviewDetailsSheet';

export default function ReviewModerationPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [businessFilter, setBusinessFilter] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'reports'>('newest');
    const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // View Details State
    const [viewingReviewId, setViewingReviewId] = useState<string | null>(null);

    // Fetch Single Review for Details View (re-using bulk fetch by updated ID list logic or creating specific single fetch)
    const { data: viewingReviewDetails } = useQuery({
        queryKey: ['review-details', viewingReviewId],
        queryFn: async () => {
            if (!viewingReviewId) return null;
            const results = await getReviewsByIds([viewingReviewId]);
            return results[0] || null;
        },
        enabled: !!viewingReviewId
    });

    // Bulk Reject State
    const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);
    const [bulkRejectReason, setBulkRejectReason] = useState('');

    // Fetch Pending Reviews
    const { data: pendingReviews, refetch: refetchPending, isLoading: isLoadingPending } = useQuery({
        queryKey: ['pending-reviews'],
        queryFn: getPendingReviews
    });

    // Fetch Reported Reviews Data (Counts + IDs)
    const { data: reportData, refetch: refetchReports } = useQuery({
        queryKey: ['pending-reports'],
        queryFn: getPendingReports
    });

    // Fetch Actual Reported Review Details
    const { data: reportedReviews, refetch: refetchReportedDetails, isLoading: isLoadingReported } = useQuery({
        queryKey: ['reported-reviews-details', reportData?.reviewsWithReports],
        queryFn: async () => {
            if (!reportData?.reviewsWithReports?.length) return [];
            const ids = reportData.reviewsWithReports.map((r: any) => r.reviewId);
            const reviews = await getReviewsByIds(ids);

            // Map counts
            const countMap = new Map(reportData.reviewsWithReports.map((r: any) => [r.reviewId, r.reportCount]));
            return reviews.map(r => ({
                ...r,
                report_count: countMap.get(r.id) || 0
            }));
        },
        enabled: !!reportData?.reviewsWithReports?.length
    });

    // Pending Count (fast polling)
    const { data: pendingCount } = useQuery({
        queryKey: ['pending-count'],
        queryFn: getPendingReviewCount,
        refetchInterval: 30000
    });

    const handleRefresh = () => {
        refetchPending();
        refetchReports();
        refetchReportedDetails();
        setSelectedReviews([]);
    };

    const handleBulkApprove = async () => {
        if (selectedReviews.length === 0) return;

        const confirm = window.confirm(`Approve ${selectedReviews.length} reviews?`);
        if (!confirm) return;

        setIsBulkProcessing(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const id of selectedReviews) {
                try {
                    await approveReview(id);
                    successCount++;
                } catch (e) {
                    failCount++;
                }
            }
            toast.success(`Approved ${successCount} reviews` + (failCount > 0 ? `, ${failCount} failed` : ''));
            handleRefresh();
        } catch (error) {
            toast.error('Bulk action failed');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkReject = async () => {
        if (!bulkRejectReason.trim()) return;

        setIsBulkProcessing(true);
        try {
            await bulkRejectReviews(selectedReviews, bulkRejectReason);
            toast.success(`Rejected ${selectedReviews.length} reviews`);
            setIsBulkRejectOpen(false);
            setBulkRejectReason('');
            handleRefresh();
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject reviews');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setBusinessFilter('');
        setSortBy('newest');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin')}
                                className="p-2 hover:bg-white rounded-full transition-colors"
                            >
                                <ArrowLeft size={24} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
                                <p className="text-gray-500 text-sm">
                                    Manage review quality and trust
                                </p>
                            </div>
                        </div>

                        {/* Search & Sort Row */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search reviews..."
                                    className="pl-9 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Advanced Filters Row */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="text-sm font-medium text-gray-500 mr-2">Filters:</div>

                        <Input
                            placeholder="Filter by Business..."
                            className="w-48 h-9 text-sm"
                            value={businessFilter}
                            onChange={(e) => setBusinessFilter(e.target.value)}
                        />

                        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                                <SelectItem value="reports">Most Reported</SelectItem>
                            </SelectContent>
                        </Select>

                        {(searchQuery || businessFilter || sortBy !== 'newest') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 ml-auto text-gray-500 hover:text-gray-900"
                                onClick={handleClearFilters}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Statistics Tiles */}
                <ModerationStats />

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedReviews([]); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="pending" className="gap-2">
                            Pending
                            {(pendingCount || 0) > 0 && (
                                <Badge variant="secondary" className="px-1.5 py-0.5 h-auto text-[10px]">
                                    {pendingCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="reported" className="gap-2">
                            Reported
                            {(reportData?.reportCount || 0) > 0 && (
                                <Badge variant="secondary" className="px-1.5 py-0.5 h-auto text-[10px]">
                                    {reportData?.reportCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="audit">History</TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        {/* Bulk Actions Bar */}
                        {selectedReviews.length > 0 && activeTab !== 'audit' && (
                            <div className="bg-indigo-50 border border-indigo-100 p-3 mb-4 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-indigo-600">{selectedReviews.length}</Badge>
                                    <span className="text-sm font-medium text-indigo-900">reviews selected</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
                                        onClick={() => setSelectedReviews([])}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="shadow-sm"
                                        onClick={() => setIsBulkRejectOpen(true)}
                                        disabled={isBulkProcessing}
                                    >
                                        Reject Selected
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                                        onClick={handleBulkApprove}
                                        disabled={isBulkProcessing}
                                    >
                                        {isBulkProcessing ? 'Processing...' : 'Approve Selected'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <TabsContent value="pending" className="m-0">
                            {isLoadingPending ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-500">Loading pending reviews...</p>
                                </div>
                            ) : (
                                <ModerationQueue
                                    reviews={pendingReviews || []}
                                    selectedReviews={selectedReviews}
                                    onSelectionChange={setSelectedReviews}
                                    onRefresh={handleRefresh}
                                    searchQuery={searchQuery}
                                    businessFilter={businessFilter}
                                    sortBy={sortBy}
                                    type="pending"
                                    onViewReview={setViewingReviewId}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="reported" className="m-0">
                            {isLoadingReported ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-500">Loading reported reviews...</p>
                                </div>
                            ) : (
                                <ModerationQueue
                                    reviews={reportedReviews || []}
                                    selectedReviews={selectedReviews}
                                    onSelectionChange={setSelectedReviews}
                                    onRefresh={handleRefresh}
                                    searchQuery={searchQuery}
                                    businessFilter={businessFilter} // Allow filtering here too
                                    sortBy={sortBy === 'newest' ? 'reports' : sortBy} // Default to reports sort for reported, unless overridden? Actually sticking to global sort is fine
                                    type="reported"
                                    reportData={reportData}
                                    onViewReview={setViewingReviewId}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="audit" className="m-0">
                            <ModerationAuditLog onViewReview={setViewingReviewId} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Bulk Reject Dialog */}
            <Dialog open={isBulkRejectOpen} onOpenChange={setIsBulkRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Multiple Reviews</DialogTitle>
                        <DialogDescription>
                            You are about to reject {selectedReviews.length} reviews.
                            This action cannot be undone. Please provide a reason that applies to all selected reviews.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={bulkRejectReason}
                            onChange={(e) => setBulkRejectReason(e.target.value)}
                            placeholder="Reason for rejection (e.g. Violation of guidelines)"
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkRejectOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkReject}
                            disabled={!bulkRejectReason.trim() || isBulkProcessing}
                        >
                            {isBulkProcessing ? 'Rejecting...' : 'Reject All'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Global Review Details Modal */}
            <ReviewDetailsModal
                review={viewingReviewDetails || null}
                onClose={() => setViewingReviewId(null)}
                onApprove={async (id) => {
                    try {
                        await approveReview(id);
                        toast.success('Review approved');
                        handleRefresh();
                        setViewingReviewId(null);
                    } catch (e) {
                        toast.error('Failed to approve review');
                    }
                }}
                onReject={(review) => {
                    setViewingReviewId(null);
                    // Set up rejection state
                    setSelectedReviews([review.id]);
                    setIsBulkRejectOpen(true);
                    // Note: We are reusing the bulk reject dialog for single rejection here for simplicity,
                    // or we could add back a single reject dialog if preferred.
                    // A better UX might be to open the single RejectReviewDialog logic.
                    // But for now, let's reuse the bulk one as it does the same job if we just want a reason.
                    // actually, ReviewDetailsSheet usually triggers a specific reject flow.
                    // Let's implement a specific single reject flow if needed or reuse bulk.
                    // The user previously had RejectReviewDialog. Let's make sure we have that imported if we want to use it.
                    // Actually, I'll use the bulk dialog logic but adapt it for single if needed,
                    // OR just use the bulk dialog since it takes a list.
                }}
            />
        </div>
    );
}
