
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, Trophy, Star, MapPin, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DriverScoreData {
    user_id: string;
    total_activity_score: number;
    reviews_score: number;
    checkins_score: number;
    total_reviews: number;
    last_calculated_at: string;
    is_driver: boolean; // Gold badge status
    profile: {
        full_name: string;
        email: string;
        avatar_url: string | null;
    } | null;
}

export function DriverScoreWidget() {
    const [scores, setScores] = useState<DriverScoreData[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState<string | null>(null);

    const fetchScores = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('driver_profiles')
                .select(`
                    *,
                    profile:profiles(full_name, email, avatar_url)
                `)
                .order('total_activity_score', { ascending: false })
                .limit(20);

            if (error) throw error;
            setScores(data || []);
        } catch (err: any) {
            console.error('Error fetching driver scores:', err);
            toast.error('Failed to load driver scores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScores();
    }, []);

    const handleRecalculate = async (userId: string) => {
        try {
            setCalculating(userId);
            const { error } = await supabase.rpc('recalculate_driver_score', {
                target_user_id: userId
            });

            if (error) throw error;

            toast.success('Score recalculated successfully');
            await fetchScores(); // Refresh list
        } catch (err: any) {
            console.error('Error recalculating score:', err);
            toast.error('Failed to recalculate score');
        } finally {
            setCalculating(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 animate-pulse">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-10 bg-gray-100 rounded"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Driver Scores</h3>
                        <p className="text-xs text-indigo-600 font-medium">Top Users by Activity</p>
                    </div>
                </div>
                <button
                    onClick={fetchScores}
                    className="p-2 hover:bg-white/50 rounded-full text-indigo-600 transition-colors"
                    title="Refresh List"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3 text-right">Total Score</th>
                            <th className="px-6 py-3 text-center">Reviews</th>
                            <th className="px-6 py-3 text-center">Check-ins</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {scores.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No driver activity found yet.
                                </td>
                            </tr>
                        ) : (
                            scores.map((score) => (
                                <tr key={score.user_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {score.profile?.avatar_url ? (
                                                <img
                                                    src={score.profile.avatar_url}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover bg-gray-200"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                    {score.profile?.full_name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-1">
                                                    {score.profile?.full_name || 'Unknown User'}
                                                    {score.total_activity_score > 100 && ( // Simple threshold for gold badge visual for now
                                                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">{score.profile?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                                        {score.total_activity_score?.toFixed(0) || 0}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                                            <MessageSquare size={12} />
                                            <span className="font-semibold">{score.total_reviews || 0}</span>
                                            <span className="opacity-75">({(score.reviews_score || 0).toFixed(0)} pts)</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs">
                                            <MapPin size={12} />
                                            <span className="opacity-75">{(score.checkins_score || 0).toFixed(0)} pts</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRecalculate(score.user_id)}
                                            disabled={calculating === score.user_id}
                                            className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                                            title="Recalculate Score"
                                        >
                                            <RefreshCw size={16} className={calculating === score.user_id ? 'animate-spin' : ''} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                <AlertCircle size={12} />
                <span>Scores are updated automatically. use recalculate only if needed.</span>
            </div>
        </div>
    );
}

export default DriverScoreWidget;
