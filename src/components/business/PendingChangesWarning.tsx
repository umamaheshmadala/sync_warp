
import React, { useEffect, useState } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingChangesWarningProps {
    businessId: string;
    onDismiss?: () => void;
}

interface PendingEdit {
    pending_business_name?: string;
    pending_address?: string;
    pending_city?: string;
    pending_state?: string;
    pending_postal_code?: string;
    pending_categories?: string[];
    created_at: string;
}

export const PendingChangesWarning: React.FC<PendingChangesWarningProps> = ({ businessId, onDismiss }) => {
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        async function fetchPendingEdits() {
            try {
                const { data, error } = await supabase
                    .from('business_pending_edits')
                    .select('*')
                    .eq('business_id', businessId)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                    console.error('Error fetching pending edits:', error);
                }

                if (data) {
                    setPendingEdit(data);
                }
            } catch (err) {
                console.error('Failed to fetch pending edits:', err);
            } finally {
                setLoading(false);
            }
        }

        if (businessId) {
            fetchPendingEdits();
        }
    }, [businessId]);

    if (loading || !pendingEdit) return null;

    // Helper to get readable field names
    const getFieldLabel = (key: string) => {
        const labels: Record<string, string> = {
            pending_business_name: 'Business Name',
            pending_address: 'Address',
            pending_city: 'City',
            pending_state: 'State',
            pending_postal_code: 'Postal Code',
            pending_categories: 'Categories'
        };
        return labels[key] || key.replace('pending_', '').replace('_', ' ');
    };

    // Get list of changed fields (excluding id, timestamps, foreign keys)
    const changes = Object.entries(pendingEdit)
        .filter(([key, value]) =>
            key.startsWith('pending_') &&
            value !== null &&
            value !== undefined
        );

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-yellow-800">
                            Changes pending admin approval
                        </h3>
                        <div className="mt-1 text-sm text-yellow-700">
                            <p>
                                Your recent edits to sensitive fields are awaiting review. Your business remains active with the previously approved details.
                            </p>

                            {changes.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setExpanded(!expanded)}
                                        className="flex items-center text-xs font-semibold text-yellow-800 hover:text-yellow-900 focus:outline-none"
                                    >
                                        {expanded ? (
                                            <>
                                                <ChevronUp className="h-3 w-3 mr-1" />
                                                Hide Details
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                Show {changes.length} Pending Change{changes.length !== 1 ? 's' : ''}
                                            </>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {expanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden mt-2"
                                            >
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {changes.map(([key, value]) => (
                                                        <li key={key} className="text-xs text-yellow-800 break-words">
                                                            <span className="font-medium">{getFieldLabel(key)}:</span>{' '}
                                                            <span className="italic">
                                                                {Array.isArray(value) ? value.join(', ') : String(value)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="flex-shrink-0 ml-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                        <X className="h-5 w-5 text-yellow-400 hover:text-yellow-500" />
                    </button>
                )}
            </div>
        </div>
    );
};
