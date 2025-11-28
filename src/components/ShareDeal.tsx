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
import { Share2, Mail, Link as LinkIcon, Users, Copy, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FriendPickerModal } from './Sharing/FriendPickerModal';
import { trackEvent } from '../lib/analytics';
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
    const [email, setEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    const dealUrl = `${window.location.origin}/deals/${deal.id}`;

    // Copy link to clipboard
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(dealUrl);
            setLinkCopied(true);
            toast.success('Link copied to clipboard!');
            trackEvent('deal_shared', {
                method: 'link',
                deal_id: deal.id,
                deal_title: deal.title
            });

            // Reset copied state after 2 seconds
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy link');
            console.error('Copy error:', error);
        }
    };

    // Share via email
    const handleEmailShare = async () => {
        if (!email) {
            toast.error('Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsSendingEmail(true);
        try {
            // For now, use mailto: link as fallback
            // TODO: Implement backend API endpoint for email sharing
            const subject = encodeURIComponent(`Check out this deal: ${deal.title}`);
            const body = encodeURIComponent(
                `I found this great deal and thought you might be interested!\n\n` +
                `${deal.title}\n` +
                `${deal.description || ''}\n\n` +
                `View deal: ${dealUrl}`
            );

            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

            toast.success('Opening email client...');
            setEmail('');

            trackEvent('deal_shared', {
                method: 'email',
                deal_id: deal.id,
                deal_title: deal.title
            });
        } catch (error) {
            toast.error('Failed to send email');
            console.error('Email error:', error);
        } finally {
            setIsSendingEmail(false);
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

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Deal</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="friends" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="friends">
                            <Users className="mr-2 h-4 w-4" />
                            Friends
                        </TabsTrigger>
                        <TabsTrigger value="link">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Link
                        </TabsTrigger>
                        <TabsTrigger value="email">
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                        </TabsTrigger>
                    </TabsList>

                    {/* Friends Tab */}
                    <TabsContent value="friends" className="space-y-4 mt-4">
                        <div className="text-sm text-muted-foreground mb-4">
                            Select friends to share this deal with
                        </div>
                        <FriendPickerModal
                            key={isOpen ? 'open' : 'closed'}
                            dealId={deal.id}
                            isOpen={true}
                            onClose={() => setIsOpen(false)}
                            onSuccess={handleFriendShareSuccess}
                        />
                    </TabsContent>

                    {/* Link Tab */}
                    <TabsContent value="link" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="deal-link">Deal Link</Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="deal-link"
                                    value={dealUrl}
                                    readOnly
                                    className="flex-1"
                                />
                                <Button onClick={handleCopyLink} variant="secondary">
                                    {linkCopied ? (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Anyone with this link can view the deal
                            </p>
                        </div>
                    </TabsContent>

                    {/* Email Tab */}
                    <TabsContent value="email" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="friend@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleEmailShare();
                                    }
                                }}
                            />
                        </div>
                        <Button
                            onClick={handleEmailShare}
                            disabled={isSendingEmail || !email}
                            className="w-full"
                        >
                            {isSendingEmail ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Opens your default email client with a pre-filled message
                        </p>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

export default ShareDeal;
