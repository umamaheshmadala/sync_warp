Create a settings page where users can customize their notification preferences. Users can toggle notifications for different event types and choose delivery methods (push, email, in-app).

---

## ✅ Acceptance Criteria

### UI Components
- [ ] Notification preferences section in Settings
- [ ] Toggle for each notification type
- [ ] Separate controls for push/email/in-app
- [ ] "Mute all notifications" master toggle
- [ ] Save preferences automatically
- [ ] Loading and success states

### Notification Types
- [ ] Friend requests
- [ ] Friend request accepted
- [ ] Deal shared with you
- [ ] Birthday reminders (optional)

### Functionality
- [ ] Load current preferences from database
- [ ] Save preferences to `notification_preferences` column
- [ ] Real-time sync across devices
- [ ] Optimistic UI updates

---

## 🎨 Component Implementation

### File: `src/components/settings/NotificationPreferences.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Mail, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface NotificationPrefs {
  push_enabled: boolean;
  email_enabled: boolean;
  friend_requests: boolean;
  friend_accepted: boolean;
  deal_shared: boolean;
  birthday_reminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  push_enabled: true,
  email_enabled: false,
  friend_requests: true,
  friend_accepted: true,
  deal_shared: true,
  birthday_reminders: false,
};

export function NotificationPreferences() {
  const queryClient = useQueryClient();

  // Fetch current preferences
  const { data: preferences = DEFAULT_PREFS, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.user.id)
        .single();

      if (error) throw error;
      return { ...DEFAULT_PREFS, ...data.notification_preferences } as NotificationPrefs;
    },
  });

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: async (newPrefs: Partial<NotificationPrefs>) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const updatedPrefs = { ...preferences, ...newPrefs };

      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updatedPrefs })
        .eq('id', user.user.id);

      if (error) throw error;
      return updatedPrefs;
    },
    onMutate: async (newPrefs) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] });
      const previous = queryClient.getQueryData(['notification-preferences']);
      queryClient.setQueryData(['notification-preferences'], (old: NotificationPrefs) => ({
        ...old,
        ...newPrefs,
      }));
      return { previous };
    },
    onError: (err, newPrefs, context) => {
      // Rollback on error
      queryClient.setQueryData(['notification-preferences'], context?.previous);
      toast.error('Failed to update preferences');
    },
    onSuccess: () => {
      toast.success('Preferences updated');
    },
  });

  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  const handleMuteAll = (muted: boolean) => {
    updatePrefsMutation.mutate({
      push_enabled: !muted,
      email_enabled: !muted,
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading preferences...</div>;
  }

  const allMuted = !preferences.push_enabled && !preferences.email_enabled;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Manage how you receive notifications
        </p>
      </div>

      {/* Mute All */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
        <div className="flex items-center space-x-3">
          {allMuted ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5 text-primary" />
          )}
          <div>
            <Label htmlFor="mute-all" className="font-medium">
              Mute all notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Disable all push and email notifications
            </p>
          </div>
        </div>
        <Switch
          id="mute-all"
          checked={allMuted}
          onCheckedChange={handleMuteAll}
        />
      </div>

      <Separator />

      {/* Delivery Methods */}
      <div className="space-y-4">
        <h4 className="font-medium">Delivery Methods</h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="push-enabled">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications on your device
              </p>
            </div>
          </div>
          <Switch
            id="push-enabled"
            checked={preferences.push_enabled}
            onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
            disabled={allMuted}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="email-enabled">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
          </div>
          <Switch
            id="email-enabled"
            checked={preferences.email_enabled}
            onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
            disabled={allMuted}
          />
        </div>
      </div>

      <Separator />

      {/* Notification Types */}
      <div className="space-y-4">
        <h4 className="font-medium">Notification Types</h4>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="friend-requests">Friend Requests</Label>
            <p className="text-xs text-muted-foreground">
              When someone sends you a friend request
            </p>
          </div>
          <Switch
            id="friend-requests"
            checked={preferences.friend_requests}
            onCheckedChange={(checked) => handleToggle('friend_requests', checked)}
            disabled={allMuted}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="friend-accepted">Friend Request Accepted</Label>
            <p className="text-xs text-muted-foreground">
              When someone accepts your friend request
            </p>
          </div>
          <Switch
            id="friend-accepted"
            checked={preferences.friend_accepted}
            onCheckedChange={(checked) => handleToggle('friend_accepted', checked)}
            disabled={allMuted}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="deal-shared">Deal Shared</Label>
            <p className="text-xs text-muted-foreground">
              When a friend shares a deal with you
            </p>
          </div>
          <Switch
            id="deal-shared"
            checked={preferences.deal_shared}
            onCheckedChange={(checked) => handleToggle('deal_shared', checked)}
            disabled={allMuted}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="birthday-reminders">Birthday Reminders</Label>
            <p className="text-xs text-muted-foreground">
              Remind you of your friends' birthdays
            </p>
          </div>
          <Switch
            id="birthday-reminders"
            checked={preferences.birthday_reminders}
            onCheckedChange={(checked) => handleToggle('birthday_reminders', checked)}
            disabled={allMuted}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 📱 Integration into Settings Page

### Update `src/components/Settings.tsx`:

```typescript
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account preferences and app settings
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-6">
          <NotificationPreferences />
        </TabsContent>

        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Navigate to Settings → Notifications tab
- [ ] Toggle "Mute all" → verify all toggles disable
- [ ] Toggle individual notification types
- [ ] Verify changes save automatically
- [ ] Check toast notifications appear
- [ ] Test on multiple devices → verify sync
- [ ] Reload page → verify preferences persist

### Test Preferences Query

```sql
-- Check user's notification preferences
SELECT notification_preferences 
FROM profiles 
WHERE id = '<user-id>';
```

---

## ✅ Definition of Done

- [ ] `NotificationPreferences` component created
- [ ] All toggles working correctly
- [ ] Mute all functionality implemented
- [ ] Optimistic UI updates working
- [ ] Preferences save to database
- [ ] Integrated into Settings page
- [ ] Real-time sync across devices
- [ ] Manual testing completed

---

**Next Story:** [STORY 9.6.6: Email Notifications](./STORY_9.6.6_Email_Notifications.md)
