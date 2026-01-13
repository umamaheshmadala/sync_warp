import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Building2, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface PendingBusiness {
    id: string;
    business_name: string;
    business_type: string;
    city: string;
    status: string;
    created_at: string;
    business_phone: string | null;
    owner?: {
        full_name: string;
        email: string;
    };
}

export function BusinessActivationWidget() {
    const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPendingBusinesses = async () => {
        setLoading(true);
        // Fetch pending businesses
        // Note: We need to join with profiles to get owner name, but for now simple fetch
        const { data, error } = await supabase
            .from('businesses')
            .select('id, business_name, business_type, city, status, created_at, business_phone')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pending businesses:', error);
        } else {
            setBusinesses(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPendingBusinesses();
    }, []);

    const handleAction = async (id: string, action: 'activate' | 'reject') => {
        setProcessingId(id);
        const newStatus = action === 'activate' ? 'active' : 'suspended';

        // 1. Update status
        const { error } = await supabase
            .from('businesses')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error(`Error ${action}ing business:`, error);
            alert(`Failed to ${action} business`);
        } else {
            // 2. Refresh list locally
            setBusinesses(prev => prev.filter(b => b.id !== id));

            // Optional: Add notification here
        }
        setProcessingId(null);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded" />
                    <div className="h-16 bg-gray-100 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Pending Activations
                    <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {businesses.length}
                    </span>
                </h3>
            </div>

            <div className="divide-y divide-gray-100 lg:max-h-[400px] lg:overflow-y-auto">
                {businesses.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 text-green-100 mx-auto mb-3" />
                        <p>All businesses processed!</p>
                    </div>
                ) : (
                    businesses.map((business) => (
                        <div key={business.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-medium text-gray-900 text-lg">
                                        {business.business_name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                                            {business.business_type}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} /> {business.city}
                                        </span>
                                    </div>
                                </div>
                                {/* Link to view public page (if possible) or admin details */}
                                {/* <Link to={`/business/${business.id}`} target="_blank" className="text-gray-400 hover:text-indigo-600">
                    <ExternalLink size={16} />
                </Link> */}
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar size={12} />
                                    Date: {new Date(business.created_at).toLocaleDateString()}
                                    {business.business_phone && (
                                        <span className="ml-2">• Ph: {business.business_phone}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleAction(business.id, 'reject')}
                                        disabled={processingId === business.id}
                                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <XCircle size={16} />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(business.id, 'activate')}
                                        disabled={processingId === business.id}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 shadow-sm"
                                    >
                                        <CheckCircle size={16} />
                                        Activate
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
