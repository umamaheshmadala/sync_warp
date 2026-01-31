import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OperatingHoursEditor } from './OperatingHoursEditor';
import { AdminBusinessDetails, updateBusiness } from '@/services/adminBusinessService';
import { toast } from 'react-hot-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EditBusinessModalProps {
    business: AdminBusinessDetails | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditBusinessModal({ business, isOpen, onClose, onSuccess }: EditBusinessModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<AdminBusinessDetails>>({});

    // Initialize form data when business changes
    useEffect(() => {
        if (business) {
            setFormData({
                business_name: business.business_name,
                business_type: business.business_type,
                business_email: business.business_email,
                business_phone: business.business_phone,
                city: business.city,
                business_description: business.business_description,
                business_address: business.business_address,
                business_website: business.business_website,
                operating_hours: business.operating_hours || {},
                logo_url: business.logo_url,
                cover_image_url: business.cover_image_url,
            });
        }
    }, [business]);

    if (!business) return null;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Calculate changes for audit log
            const changes: Record<string, { from: any, to: any }> = {};

            Object.keys(formData).forEach(key => {
                const k = key as keyof AdminBusinessDetails;
                // Simple comparison (JSON.stringify for objects)
                if (JSON.stringify(formData[k]) !== JSON.stringify(business[k])) {
                    changes[key] = { from: business[k], to: formData[k] };
                }
            });

            if (Object.keys(changes).length === 0) {
                toast.success('No changes to save');
                onClose();
                return;
            }

            await updateBusiness(business.id, formData, changes);
            toast.success('Business updated successfully');
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update business');
        } finally {
            setIsLoading(false);
        }
    };

    // Image Upload Logic (Simplified inline for now)
    const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${business.id}/${type}_${Date.now()}.${fileExt}`;
            const bucket = 'business-media'; // Assuming this bucket exists based on other code usually

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            handleChange(type === 'logo' ? 'logo_url' : 'cover_image_url', publicUrl);
            toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded`);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Upload failed');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Business Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Business Name</Label>
                            <Input
                                value={formData.business_name || ''}
                                onChange={e => handleChange('business_name', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category/Type</Label>
                            <Input
                                value={formData.business_type || ''}
                                onChange={e => handleChange('business_type', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={formData.business_email || ''}
                                onChange={e => handleChange('business_email', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={formData.business_phone || ''}
                                onChange={e => handleChange('business_phone', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Address & Description */}
                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input
                            value={formData.business_address || ''}
                            onChange={e => handleChange('business_address', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                            value={formData.city || ''}
                            onChange={e => handleChange('city', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={formData.business_description || ''}
                            onChange={e => handleChange('business_description', e.target.value)}
                            className="h-24"
                        />
                    </div>

                    {/* Operating Hours */}
                    <div className="space-y-2">
                        <Label>Operating Hours</Label>
                        <OperatingHoursEditor
                            value={formData.operating_hours || {}}
                            onChange={val => handleChange('operating_hours', val)}
                        />
                    </div>

                    {/* Images */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Logo</Label>
                            <div className="flex items-center gap-4">
                                {formData.logo_url && (
                                    <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover border" />
                                )}
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="w-full max-w-xs"
                                        onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Cover Image</Label>
                            <div className="space-y-2">
                                {formData.cover_image_url && (
                                    <img src={formData.cover_image_url} alt="Cover" className="w-full h-32 rounded-md object-cover border" />
                                )}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
