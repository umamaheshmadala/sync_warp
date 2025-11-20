import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MessageCircle, Heart, Share2 } from "lucide-react";

export function RecentActivityFeed() {
    // TODO: Replace with real data from friend_activities table (Epic 9.6: Friend Activity Notifications)
    // For now, using mock data to demonstrate the UI component

    interface ActivityItem {
        id: string;
        type: 'like' | 'comment' | 'review' | 'checkin';
        content: string;
        timestamp: string;
        targetName?: string;
    }

    const MOCK_ACTIVITY: ActivityItem[] = [
        { id: '1', type: 'review', content: 'Reviewed', targetName: 'The Coffee House', timestamp: '2h ago' },
        { id: '2', type: 'checkin', content: 'Checked in at', targetName: 'Downtown Gym', timestamp: '5h ago' },
        { id: '3', type: 'like', content: 'Liked a deal at', targetName: 'Burger King', timestamp: '1d ago' },
    ];

    return (
        <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
            <div className="space-y-4">
                {MOCK_ACTIVITY.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-gray-300" />
                        <div className="text-sm">
                            <span className="font-medium text-gray-900">{item.content} </span>
                            <span className="font-bold text-gray-800">{item.targetName}</span>
                            <p className="text-xs text-gray-500 mt-0.5">{item.timestamp}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
