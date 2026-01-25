import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getModerationLogs, ModerationLogEntry } from '@/services/moderationService';
import { Search } from 'lucide-react';

export function ModerationAuditLog({ onViewReview }: { onViewReview: (id: string) => void }) {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: logs, isLoading } = useQuery({
        queryKey: ['moderation-audit-log'],
        queryFn: () => getModerationLogs(100),
        refetchInterval: 30000
    });

    const filteredLogs = logs?.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.admin?.full_name?.toLowerCase().includes(q) ||
            log.review_id.toLowerCase().includes(q) ||
            log.reason?.toLowerCase().includes(q)
        );
    });

    if (isLoading) {
        return <div className="p-12 text-center text-gray-500">Loading audit history...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search logs by admin, ID, or reason..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-500">Time</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-500">Action</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-500">Admin</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-500">Review ID</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-500">Reason / Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLogs?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    No audit logs found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredLogs?.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-sm text-gray-700">
                                        <div className="font-medium">
                                            {format(new Date(log.created_at), 'MMM d, yyyy')}
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {format(new Date(log.created_at), 'h:mm a')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge variant="outline" className={
                                            log.action === 'approve'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                        }>
                                            {log.action.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-gray-900">
                                        {log.admin?.full_name || 'System / Unknown'}
                                    </td>
                                    <td className="p-4 text-sm font-mono">
                                        <button
                                            onClick={() => onViewReview(log.review_id)}
                                            className="text-indigo-600 hover:underline hover:text-indigo-800"
                                            title="View Review Details"
                                        >
                                            {log.review_id.slice(0, 8)}...
                                        </button>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {log.reason ? (
                                            <span>{log.reason}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
