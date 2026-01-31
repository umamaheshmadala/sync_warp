import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Pencil, Trash2, MapPin, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BusinessDetailsTab } from './BusinessDetailsTab';
import { BusinessAuditHistoryTab } from './BusinessAuditHistoryTab';
import { BusinessOwnerInfoTab } from './BusinessOwnerInfoTab';
import { ApproveBusinessDialog } from './ApproveBusinessDialog';
import { RejectBusinessDialog } from './RejectBusinessDialog';
import { useBusinessDetails, useBusinessAuditHistory } from '@/hooks/useBusinessDetails';
import { deleteBusiness } from '@/services/adminBusinessService';

interface BusinessDetailModalProps {
    businessId: string | null;
    onClose: () => void;
    onActionComplete: () => void;
}

export function BusinessDetailModal({
    businessId,
    onClose,
    onActionComplete
}: BusinessDetailModalProps) {
    const [activeTab, setActiveTab] = useState('details');
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: business, isLoading } = useBusinessDetails(businessId);
    // Prefetch audit history so it's ready when tab is clicked
    const { data: auditData, isLoading: isAuditLoading } = useBusinessAuditHistory(businessId || '');

    const handleDelete = async () => {
        if (!business) return;
        if (!window.confirm(`Are you sure you want to delete ${business.business_name}? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteBusiness(business.id);
            toast.success('Business deleted successfully');
            onActionComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete business');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!businessId) return null;

    const canApprove = business?.status === 'pending' || business?.status === 'rejected';
    const canReject = business?.status === 'pending' || business?.status === 'active';
    const canDelete = business?.status !== 'deleted';

    return (
        <>
            <Dialog open={!!businessId} onOpenChange={() => onClose()}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 border-none shadow-2xl rounded-xl">
                    <DialogHeader className="p-6 pb-4 border-b bg-white rounded-t-xl sticky top-0 z-10">
                        <div className="flex items-center justify-between pr-8">
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                                    {business?.business_name || 'Business Details'}
                                </DialogTitle>
                                {business && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>{business.city}</span>
                                        <span>•</span>
                                        <Badge variant={
                                            business.status === 'active' ? 'default' :
                                                business.status === 'rejected' ? 'destructive' :
                                                    business.status === 'pending' ? 'secondary' : 'outline'
                                        } className="capitalize px-2.5 py-0.5 text-xs font-semibold shadow-none border-0">
                                            {business.status}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50/50">
                            <div className="flex flex-col items-center gap-3">
                                <span className="loading loading-spinner loading-lg"></span>
                                <p>Loading details...</p>
                            </div>
                        </div>
                    ) : business ? (
                        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                <div className="px-6 pt-4 bg-white border-b">
                                    <TabsList className="w-full justify-start h-auto p-0 bg-transparent space-x-6">
                                        {['details', 'audit', 'owner'].map((tab) => (
                                            <TabsTrigger
                                                key={tab}
                                                value={tab}
                                                className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors bg-transparent capitalize"
                                            >
                                                {tab === 'audit' ? 'Audit History' : tab === 'owner' ? 'Owner Info' : 'Details'}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>

                                <TabsContent value="details" className="flex-1 overflow-y-auto p-6 mt-0 animate-in fade-in-50 duration-200">
                                    <BusinessDetailsTab business={business} />
                                </TabsContent>

                                <TabsContent value="audit" className="flex-1 overflow-y-auto p-6 mt-0 animate-in fade-in-50 duration-200">
                                    <BusinessAuditHistoryTab
                                        business={business}
                                        auditData={auditData}
                                        isLoading={isAuditLoading}
                                    />
                                </TabsContent>

                                <TabsContent value="owner" className="flex-1 overflow-y-auto p-6 mt-0 animate-in fade-in-50 duration-200">
                                    <BusinessOwnerInfoTab owner={business.owner} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-red-500">Failed to load business details.</div>
                    )}

                    <DialogFooter className="p-4 px-6 border-t bg-white rounded-b-xl flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                            {business && canDelete && (
                                <Button
                                    variant="ghost"
                                    className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {isDeleting ? 'Deleting...' : 'Delete Business'}
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={onClose} className="border-gray-200">Close</Button>

                            {business && canReject && (
                                <Button
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700 text-white shadow-sm ring-1 ring-red-600 ring-offset-1"
                                    onClick={() => setShowRejectDialog(true)}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Reject Application
                                </Button>
                            )}

                            {business && canApprove && (
                                <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm ring-1 ring-green-600 ring-offset-1"
                                    onClick={() => setShowApproveDialog(true)}
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Approve Business
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Action Dialogs */}
            {business && (
                <>
                    <ApproveBusinessDialog
                        business={business}
                        isOpen={showApproveDialog}
                        onClose={() => setShowApproveDialog(false)}
                        onSuccess={() => {
                            setShowApproveDialog(false);
                            onActionComplete();
                            onClose();
                        }}
                    />

                    <RejectBusinessDialog
                        business={business}
                        isOpen={showRejectDialog}
                        onClose={() => setShowRejectDialog(false)}
                        onSuccess={() => {
                            setShowRejectDialog(false);
                            onActionComplete();
                            onClose();
                        }}
                    />
                </>
            )}
        </>
    );
}
