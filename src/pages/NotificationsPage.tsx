import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Trash2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Real-time updates
  useRealtimeNotifications();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate logic (same as NotificationCenter)
    const actionUrl = notification.data?.action_url;
    if (actionUrl) {
      navigate(actionUrl);
    } else {
      switch (notification.type) {
        case 'friend_request':
          navigate('/friends/requests');
          break;
        case 'friend_accepted':
          navigate('/friends');
          break;
        case 'deal_shared':
          if (notification.data?.deal_id) {
            navigate(`/deals/${notification.data.deal_id}`);
          }
          break;
        case 'birthday_reminder':
          if (notification.data?.friend_id) {
            navigate(`/profile/${notification.data.friend_id}`);
          }
          break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              View and manage all your notifications
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
            <p className="text-gray-500 mt-1">We'll notify you when something important happens</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md flex items-start justify-between group',
                  !notification.is_read && 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100'
                )}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-full flex-shrink-0 mt-0.5",
                      notification.type === 'friend_request' ? "bg-blue-100 text-blue-600" :
                        notification.type === 'friend_accepted' ? "bg-green-100 text-green-600" :
                          notification.type === 'deal_shared' ? "bg-purple-100 text-purple-600" :
                            "bg-gray-100 text-gray-600"
                    )}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className={cn("font-medium text-gray-900", !notification.is_read && "font-semibold")}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotificationMutation.mutate(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
