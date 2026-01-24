import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { getPendingReviewCount } from '../../services/moderationService';

export function ReviewModerationWidget() {
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const count = await getPendingReviewCount();
            setPendingCount(count);
        } catch (error) {
            console.error('Failed to load pending reviews count:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                        <ClipboardList size={24} />
                    </div>
                    {pendingCount > 0 && (
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-1">Review Moderation</h3>

                {loading ? (
                    <div className="animate-pulse h-8 bg-gray-100 rounded w-16 mb-2"></div>
                ) : (
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold text-gray-900">{pendingCount}</span>
                        <span className="text-sm text-gray-500">pending</span>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span> Requires approval</span>
                    </div>

                    {pendingCount === 0 && (
                        <div className="flex items-center text-sm text-green-600 gap-2">
                            <CheckCircle size={16} />
                            <span>All caught up!</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
                <button
                    onClick={() => navigate('/admin/moderation')}
                    className="w-full flex items-center justify-between text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    View Moderation Queue
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
