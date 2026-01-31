import React from 'react';
import { AdminBusinessDetails } from '@/services/adminBusinessService';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface BusinessOwnerInfoTabProps {
    owner: AdminBusinessDetails['owner'];
}

export function BusinessOwnerInfoTab({ owner }: BusinessOwnerInfoTabProps) {
    if (!owner) return <div className="text-gray-500">No owner information available.</div>;

    return (
        <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Owner Profile
                </h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-[100px_1fr] gap-4 text-sm items-center">
                        <span className="text-gray-500">Full Name:</span>
                        <span className="font-medium text-lg">{owner.full_name || 'Unknown'}</span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-4 text-sm items-center">
                        <span className="text-gray-500">Email:</span>
                        <a href={`mailto:${owner.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {owner.email}
                        </a>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-4 text-sm items-center">
                        <span className="text-gray-500">Phone:</span>
                        {owner.phone_number ? (
                            <a href={`tel:${owner.phone_number}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {owner.phone_number}
                            </a>
                        ) : (
                            <span className="text-gray-400">Not provided</span>
                        )}
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-4 text-sm items-center">
                        <span className="text-gray-500">Member Since:</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {owner.created_at ? format(new Date(owner.created_at), 'PPP') : 'Unknown'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
