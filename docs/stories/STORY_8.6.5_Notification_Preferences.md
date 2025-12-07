# ⚙️ STORY 8.6.5: Notification Preferences & Settings

**Parent Epic:** [EPIC 8.6 - Push Notifications & Real-time Updates](../epics/EPIC_8.6_Push_Notifications.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day → **0.5 days (Partially Implemented)**  
**Priority:** P1 - High  
**Status:** 🟡 Partially Implemented - Missing Quiet Hours & Mute  
**Dependencies:** Story 8.6.4 (Notification Handling)

> [!NOTE]
> **Existing implementation:**
>
> - `src/pages/settings/NotificationSettings.tsx` - Settings page with toggles
> - `src/hooks/useNotificationPreferences.ts` - Preferences hook
>
> **Remaining work:**
>
> - Add quiet hours (DND) feature
> - Add mute conversations feature

---

## 🎯 **Story Goal**

Give users control over their notification preferences:

- Mute specific conversations
- Global notification toggle
- Sound and vibration settings
- Quiet hours (Do Not Disturb)
- Notification preview options

---

## 📋 **Acceptance Criteria**

- [ ] User can mute individual conversations
- [ ] User can disable all notifications
- [ ] Sound and vibration toggles work
- [ ] Quiet hours prevent notifications during set times
- [ ] Settings persist across app restarts
- [ ] Muted conversations don't trigger push notifications

---

## 🧩 **Implementation Details**

### Task 1: Database Schema for Notification Settings

#### 1.1 Create migration

```sql
-- supabase/migrations/YYYYMMDD_add_notification_settings.sql

-- User notification preferences table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Global settings
  enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,

  -- Preview settings
  show_preview BOOLEAN DEFAULT true,  -- Show message content in notification

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',  -- 10 PM
  quiet_hours_end TIME DEFAULT '07:00',    -- 7 AM

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Muted conversations table
CREATE TABLE IF NOT EXISTS muted_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  muted_until TIMESTAMPTZ,  -- NULL = muted forever
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(user_id, conversation_id)
);

-- RLS policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own muted conversations"
  ON muted_conversations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_muted_conversations_user ON muted_conversations(user_id);
CREATE INDEX idx_muted_conversations_conv ON muted_conversations(conversation_id);
```

---

### Task 2: Create Notification Settings Service

#### 2.1 Create notificationSettingsService.ts

```typescript
// src/services/notificationSettingsService.ts
import { supabase } from "../lib/supabase";

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface MutedConversation {
  conversationId: string;
  mutedUntil: string | null;
}

class NotificationSettingsService {
  /**
   * Get user's notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // Not found is ok
      throw error;
    }

    // Return defaults if no settings exist
    return {
      enabled: data?.enabled ?? true,
      soundEnabled: data?.sound_enabled ?? true,
      vibrationEnabled: data?.vibration_enabled ?? true,
      showPreview: data?.show_preview ?? true,
      quietHoursEnabled: data?.quiet_hours_enabled ?? false,
      quietHoursStart: data?.quiet_hours_start ?? "22:00",
      quietHoursEnd: data?.quiet_hours_end ?? "07:00",
    };
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) throw new Error("Not authenticated");

    const { error } = await supabase.from("notification_settings").upsert(
      {
        user_id: user.user.id,
        enabled: settings.enabled,
        sound_enabled: settings.soundEnabled,
        vibration_enabled: settings.vibrationEnabled,
        show_preview: settings.showPreview,
        quiet_hours_enabled: settings.quietHoursEnabled,
        quiet_hours_start: settings.quietHoursStart,
        quiet_hours_end: settings.quietHoursEnd,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) throw error;
  }

  /**
   * Mute a conversation
   */
  async muteConversation(
    conversationId: string,
    duration?: "hour" | "day" | "week" | "forever"
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) throw new Error("Not authenticated");

    let mutedUntil: string | null = null;
    if (duration && duration !== "forever") {
      const now = new Date();
      switch (duration) {
        case "hour":
          now.setHours(now.getHours() + 1);
          break;
        case "day":
          now.setDate(now.getDate() + 1);
          break;
        case "week":
          now.setDate(now.getDate() + 7);
          break;
      }
      mutedUntil = now.toISOString();
    }

    const { error } = await supabase.from("muted_conversations").upsert(
      {
        user_id: user.user.id,
        conversation_id: conversationId,
        muted_until: mutedUntil,
      },
      {
        onConflict: "user_id,conversation_id",
      }
    );

    if (error) throw error;
  }

  /**
   * Unmute a conversation
   */
  async unmuteConversation(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) throw new Error("Not authenticated");

    await supabase
      .from("muted_conversations")
      .delete()
      .eq("user_id", user.user.id)
      .eq("conversation_id", conversationId);
  }

  /**
   * Check if conversation is muted
   */
  async isConversationMuted(conversationId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) return false;

    const { data } = await supabase
      .from("muted_conversations")
      .select("muted_until")
      .eq("user_id", user.user.id)
      .eq("conversation_id", conversationId)
      .single();

    if (!data) return false;

    // Check if mute has expired
    if (data.muted_until) {
      return new Date(data.muted_until) > new Date();
    }

    return true; // Muted forever
  }

  /**
   * Get all muted conversations
   */
  async getMutedConversations(): Promise<MutedConversation[]> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) return [];

    const { data } = await supabase
      .from("muted_conversations")
      .select("conversation_id, muted_until")
      .eq("user_id", user.user.id);

    return (data || []).map((m) => ({
      conversationId: m.conversation_id,
      mutedUntil: m.muted_until,
    }));
  }

  /**
   * Check if currently in quiet hours
   */
  isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.quietHoursStart.split(":").map(Number);
    const [endH, endM] = settings.quietHoursEnd.split(":").map(Number);

    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (start <= end) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentTime >= start && currentTime < end;
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return currentTime >= start || currentTime < end;
    }
  }
}

export const notificationSettingsService = new NotificationSettingsService();
```

---

### Task 3: Create Settings UI Component

#### 3.1 Create NotificationSettingsPage.tsx

```tsx
// src/pages/NotificationSettingsPage.tsx
import React, { useState, useEffect } from "react";
import { Bell, Volume2, Vibrate, Eye, Moon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  notificationSettingsService,
  NotificationSettings,
} from "../services/notificationSettingsService";
import { toast } from "react-hot-toast";

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await notificationSettingsService.getSettings();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) {
    if (!settings) return;

    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await notificationSettingsService.updateSettings({ [key]: value });
    } catch (error) {
      toast.error("Failed to save setting");
      setSettings(settings); // Revert
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!settings) return <div>Error loading settings</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Notification Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Global Toggle */}
        <SettingCard
          icon={<Bell />}
          title="Push Notifications"
          description="Receive notifications for new messages"
          checked={settings.enabled}
          onChange={(v) => updateSetting("enabled", v)}
        />

        {settings.enabled && (
          <>
            {/* Sound */}
            <SettingCard
              icon={<Volume2 />}
              title="Sound"
              description="Play sound for notifications"
              checked={settings.soundEnabled}
              onChange={(v) => updateSetting("soundEnabled", v)}
            />

            {/* Vibration */}
            <SettingCard
              icon={<Vibrate />}
              title="Vibration"
              description="Vibrate for notifications"
              checked={settings.vibrationEnabled}
              onChange={(v) => updateSetting("vibrationEnabled", v)}
            />

            {/* Preview */}
            <SettingCard
              icon={<Eye />}
              title="Show Preview"
              description="Show message content in notifications"
              checked={settings.showPreview}
              onChange={(v) => updateSetting("showPreview", v)}
            />

            {/* Quiet Hours */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Quiet Hours</p>
                    <p className="text-sm text-gray-500">
                      Silence notifications during set times
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={settings.quietHoursEnabled}
                  onChange={(v) => updateSetting("quietHoursEnabled", v)}
                />
              </div>

              {settings.quietHoursEnabled && (
                <div className="flex gap-4 pt-2">
                  <TimeInput
                    label="Start"
                    value={settings.quietHoursStart}
                    onChange={(v) => updateSetting("quietHoursStart", v)}
                  />
                  <TimeInput
                    label="End"
                    value={settings.quietHoursEnd}
                    onChange={(v) => updateSetting("quietHoursEnd", v)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper components
function SettingCard({ icon, title, description, checked, onChange }: any) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-blue-600">{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function TimeInput({ label, value, onChange }: any) {
  return (
    <div className="flex-1">
      <label className="text-sm text-gray-500">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2 border rounded-lg"
      />
    </div>
  );
}
```

---

### Task 4: Update Backend to Respect Mute Settings

Update the edge function to check mute status:

```typescript
// In send-message-notification edge function
// Add before sending notification:

// Check if user has muted this conversation
const { data: muteData } = await supabase
  .from("muted_conversations")
  .select("muted_until")
  .eq("user_id", token.user_id)
  .eq("conversation_id", conversationId)
  .single();

if (muteData) {
  // Check if mute is still active
  if (!muteData.muted_until || new Date(muteData.muted_until) > new Date()) {
    console.log(`⏸️ Skipping notification - conversation muted for user`);
    continue; // Skip this recipient
  }
}

// Check quiet hours
const { data: settingsData } = await supabase
  .from("notification_settings")
  .select("*")
  .eq("user_id", token.user_id)
  .single();

if (settingsData?.quiet_hours_enabled) {
  // Check if currently in quiet hours
  // (implement time check logic server-side)
}
```

---

## 🔗 **MCP Integration**

### Supabase MCP - Apply Migration

```bash
warp mcp run supabase "apply_migration name=add_notification_settings query='CREATE TABLE...'"
```

### Supabase MCP - Test Mute

```sql
-- Check muted conversations for user
SELECT * FROM muted_conversations WHERE user_id = 'USER_ID';
```

---

## 🧪 **Testing**

### Manual Testing

- [ ] Toggle notifications on/off
- [ ] Sound/vibration settings respected
- [ ] Mute conversation → no notifications received
- [ ] Quiet hours block notifications during set times
- [ ] Settings persist after app restart

---

## ✅ **Definition of Done**

- [ ] Database schema created
- [ ] Settings service implemented
- [ ] Settings UI page complete
- [ ] Mute feature works end-to-end
- [ ] Quiet hours implemented
- [ ] Backend respects mute/quiet settings

---

**Epic Complete!** All stories in Epic 8.6 have been defined.
