# 📋 STORY 9.5.6: Privacy Dashboard in Settings

**Epic:** [EPIC 9.5: Privacy Controls & Settings](../epics/EPIC_9.5_Privacy_Settings.md)  
**Story Points:** 2  
**Priority:** 🟡 Medium  
**Status:** 📋 To Do

---

## 📝 **Story Description**

As a **user**, I want to **access all privacy controls in one centralized settings page** so that **I can easily manage my privacy preferences and understand all available options**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Settings page: "Friends & Privacy"
2. ✅ All privacy controls in one place
3. ✅ Section headers with icons
4. ✅ Privacy audit log (who viewed your profile - future feature placeholder)
5. ✅ Export privacy settings (GDPR compliance)
6. ✅ Clear navigation from main settings
7. ✅ Responsive design for mobile and desktop

---

## 🎨 **MCP Integration**

### **Shadcn MCP** (Medium Usage)
```bash
# Add required UI components
warp mcp run shadcn "add separator card"
```

### **Chrome DevTools MCP** (Light Usage)
```bash
# Test privacy dashboard UI
warp mcp run chrome "navigate to privacy settings and test all controls"
```

---

## 📦 **Implementation**

### **Privacy Dashboard Page**

```typescript
// src/pages/settings/FriendsPrivacySettings.tsx

import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FriendRequestPrivacy } from '@/components/friends/privacy/FriendRequestPrivacy';
import { ProfileVisibilitySettings } from '@/components/friends/privacy/ProfileVisibilitySettings';
import { OnlineStatusVisibility } from '@/components/friends/privacy/OnlineStatusVisibility';
import { BlockedUsersList } from '@/components/friends/privacy/BlockedUsersList';
import { Download, Shield, Eye, Users, Ban, FileText } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import toast from 'react-hot-toast';

export function FriendsPrivacySettings() {
  const { settings } = usePrivacySettings();

  const exportPrivacySettings = () => {
    if (!settings) return;

    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacy-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Privacy settings exported');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Friends & Privacy</h1>
        </div>
        <p className="text-muted-foreground">
          Control who can connect with you and see your information
        </p>
      </div>

      <Separator />

      {/* Friend Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friend Requests
          </CardTitle>
          <CardDescription>
            Manage who can send you friend requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FriendRequestPrivacy />
        </CardContent>
      </Card>

      {/* Profile Visibility Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile & Search Visibility
          </CardTitle>
          <CardDescription>
            Control who can see your profile and find you in search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileVisibilitySettings />
        </CardContent>
      </Card>

      {/* Online Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Online Status
          </CardTitle>
          <CardDescription>
            Manage who can see when you're online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnlineStatusVisibility />
        </CardContent>
      </Card>

      {/* Blocked Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Blocked Users
          </CardTitle>
          <CardDescription>
            View and manage users you've blocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlockedUsersList />
        </CardContent>
      </Card>

      <Separator />

      {/* GDPR Compliance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Export your privacy settings and view audit log
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Export Privacy Settings</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download a copy of your current privacy settings (GDPR compliance)
            </p>
            <Button variant="outline" onClick={exportPrivacySettings}>
              <Download className="mr-2 h-4 w-4" />
              Export Settings
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Privacy Audit Log</h4>
            <p className="text-sm text-muted-foreground mb-3">
              View when your privacy settings were changed
            </p>
            <Button variant="outline" disabled>
              <FileText className="mr-2 h-4 w-4" />
              View Audit Log (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Tips */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Privacy Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Review your privacy settings regularly to ensure they match your preferences</p>
          <p>• Use "Friends Only" settings for maximum privacy</p>
          <p>• Block users who make you uncomfortable - they won't be notified</p>
          <p>• Your privacy settings are applied in real-time across the platform</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### **Router Integration**

```typescript
// Update src/router/Router.tsx

import { FriendsPrivacySettings } from '@/pages/settings/FriendsPrivacySettings';

// Add route
{
  path: '/settings/privacy',
  element: <FriendsPrivacySettings />,
}
```

### **Settings Navigation**

```typescript
// Update src/pages/settings/SettingsPage.tsx

import { Shield } from 'lucide-react';

// Add navigation item
{
  icon: Shield,
  title: 'Friends & Privacy',
  description: 'Control who can connect with you',
  href: '/settings/privacy',
}
```

---

## 🚀 **Deployment Checklist**

- [ ] Privacy dashboard page created
- [ ] All privacy components integrated
- [ ] Export functionality working
- [ ] Router updated
- [ ] Settings navigation updated
- [ ] Responsive design verified
- [ ] GDPR compliance features added
- [ ] Privacy tips included
- [ ] Code reviewed

---

## 🧪 **Testing**

### **Manual Testing**
1. Navigate to Settings > Friends & Privacy
2. Verify all privacy controls are present
3. Test each privacy control
4. Export privacy settings
5. Verify JSON file downloads
6. Test on mobile and desktop
7. Verify navigation works
8. Test privacy tips display

### **Integration Testing**
- Verify all components load correctly
- Test real-time updates across sections
- Verify export functionality
- Test responsive design

---

## 📱 **Mobile Considerations**

- Stack sections vertically on mobile
- Ensure touch targets are large enough
- Test scrolling behavior
- Verify export works on mobile browsers

---

**Previous Story:** [STORY 9.5.5: Block List Management UI](./STORY_9.5.5_Block_List_Management.md)  
**Epic Complete!** All stories for Epic 9.5 are now defined.
