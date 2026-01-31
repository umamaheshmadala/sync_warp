import React from 'react';
import { AdminBusinessDetails } from '@/services/adminBusinessService';
import { Badge } from '@/components/ui/badge';
import { MapPin, Mail, Phone, Globe, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface BusinessDetailsTabProps {
    business: AdminBusinessDetails;
}

export function BusinessDetailsTab({ business }: BusinessDetailsTabProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{business.business_name}</span>

                        <span className="text-gray-500">Type:</span>
                        <span>{business.business_type}</span>

                        <span className="text-gray-500">Status:</span>
                        <span><Badge variant="outline" className="capitalize">{business.status}</Badge></span>

                        <span className="text-gray-500">Registered:</span>
                        <span>{format(new Date(business.created_at), 'PPP')}</span>
                    </div>

                    <div className="pt-2">
                        <p className="text-sm text-gray-500 mb-1">Description:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                            {business.business_description || 'No description provided.'}
                        </p>
                    </div>
                </div>

                {/* Contact & Address */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contact & Location</h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Address:</p>
                                <p className="text-gray-600">
                                    {business.business_address || business.city}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                                <a href={`mailto:${business.business_email}`} className="text-blue-600 hover:underline">
                                    {business.business_email || 'N/A'}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                                <a href={`tel:${business.business_phone}`} className="text-blue-600 hover:underline">
                                    {business.business_phone || 'N/A'}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                                {business.business_website ? (
                                    <a href={business.business_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {business.business_website}
                                    </a>
                                ) : <span className="text-gray-400">No website</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Images</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {business.logo_url && (
                        <div className="flex-shrink-0">
                            <p className="text-xs text-center text-gray-500 mb-1">Logo</p>
                            <img src={business.logo_url} alt="Logo" className="w-24 h-24 object-cover rounded-md border" />
                        </div>
                    )}
                    {business.cover_image_url && (
                        <div className="flex-shrink-0">
                            <p className="text-xs text-center text-gray-500 mb-1">Cover</p>
                            <img src={business.cover_image_url} alt="Cover" className="w-40 h-24 object-cover rounded-md border" />
                        </div>
                    )}
                    {business.images && business.images.length > 0 && business.images.map((img, idx) => (
                        <div key={idx} className="flex-shrink-0">
                            <p className="text-xs text-center text-gray-500 mb-1">Gallery {idx + 1}</p>
                            <img src={img} alt={`Gallery ${idx}`} className="w-32 h-24 object-cover rounded-md border" />
                        </div>
                    ))}
                    {!business.logo_url && !business.cover_image_url && (!business.images || business.images.length === 0) && (
                        <p className="text-sm text-gray-500 italic">No images uploaded.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
