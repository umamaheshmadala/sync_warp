/**
 * Unified ShareDeal Component
 * Story 9.7.5: ShareDeal Integration
 * 
 * Provides multiple sharing methods in a single dialog:
 * - Friends: Share with selected friends
 * - Link: Copy shareable link
 * - Email: Send via email
 */

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { FriendPickerModal } from './Sharing/FriendPickerModal';
import { trackEvent } from '../lib/analytics';
import { createShareRecord } from '../services/analyticsService';
import toast from 'react-hot-toast';

interface Deal {
    id: string;
    title: string;
    description?: string;
    [key: string]: any;
}

interface ShareDealProps {
    deal: Deal;
    trigger?: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareDeal({
    deal,
    trigger,
    variant = 'outline',
    size = 'default'
}: ShareDealProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Construct URL to business page with offerId query param
    // This allows deep linking to the specific offer modal on the business page
    const dealUrl = `${window.location.origin}/business/${deal.business_id}?offerId=${deal.id}`;

    // Copy link to clipboard
    const handleCopyLink = async () => {
        try {
            // Create share record to track this share
            const shareId = await createShareRecord(deal.id, 'link');

            // Append share_id to URL if created
            const shareUrl = shareId
                ? `${dealUrl}&share_id=${shareId}`
                : dealUrl;

            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard!');

            trackEvent('deal_shared', {
                method: 'link',
                deal_id: deal.id,
                deal_title: deal.title,
                share_id: shareId
            });
        } catch (error) {
            toast.error('Failed to copy link');
            console.error('Copy error:', error);
        }
    };

    const handleFriendShareSuccess = (friendIds: string[]) => {
        toast.success(`Shared with ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}!`);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant={variant} size={size}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Share Deal</DialogTitle>
                </DialogHeader>

                <FriendPickerModal
                    key={isOpen ? 'open' : 'closed'}
                    dealId={deal.id}
                    isOpen={true}
                    onClose={() => setIsOpen(false)}
                    onSuccess={handleFriendShareSuccess}
                    variant="embedded"
                    onCopyLink={handleCopyLink}
                />
            </DialogContent>
        </Dialog>
    );
}

export default ShareDeal;
