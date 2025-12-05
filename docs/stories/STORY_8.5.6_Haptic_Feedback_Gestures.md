# 📱 STORY 8.5.6: Mobile Haptic Feedback & Gestures

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation  
**Dependencies:** All previous 8.5 stories (features to add haptics to)

---

## 🎯 **Story Goal**

Implement **native haptic feedback** and **gesture controls** for iOS and Android:

- Long-press gesture for message actions
- Haptic feedback on reactions, edits, deletes
- Native action sheets for mobile
- Swipe-to-reply gesture (bonus)
- Platform-specific vibration patterns

---

## 📱 **Platform Support**

| Feature              | iOS                                      | Android                            | Web                |
| -------------------- | ---------------------------------------- | ---------------------------------- | ------------------ |
| **Long-press**       | ✅ Native                                | ✅ Native                          | ❌ (hover instead) |
| **Haptic - Light**   | UIImpactFeedbackGenerator(Light)         | VibrationEffect.EFFECT_TICK        | ❌ N/A             |
| **Haptic - Medium**  | UIImpactFeedbackGenerator(Medium)        | VibrationEffect.EFFECT_CLICK       | ❌ N/A             |
| **Haptic - Heavy**   | UIImpactFeedbackGenerator(Heavy)         | VibrationEffect.EFFECT_HEAVY_CLICK | ❌ N/A             |
| **Haptic - Success** | UINotificationFeedbackGenerator(Success) | Long vibration                     | ❌ N/A             |
| **Haptic - Warning** | UINotificationFeedbackGenerator(Warning) | Short buzz pattern                 | ❌ N/A             |
| **Haptic - Error**   | UINotificationFeedbackGenerator(Error)   | Double buzz                        | ❌ N/A             |
| **Action Sheet**     | UIAlertController                        | BottomSheetDialog                  | Modal              |

---

## 📖 **User Stories**

### As a mobile user, I want to:

1. Long-press messages to see actions
2. Feel haptic feedback when reacting
3. Use native action sheets for edit/delete
4. Have intuitive gesture-based interactions

### Acceptance Criteria:

- ✅ Long-press (500ms) triggers action menu
- ✅ Haptic feedback on: reaction, edit start, delete confirm, send
- ✅ Native action sheet on iOS/Android for message actions
- ✅ Different haptic patterns for different actions
- ✅ Graceful fallback on web (no haptics)
- ✅ Configurable haptic settings (optional)\r\n\r\n---\r\n\r\n## 🔒 **Confirmed Design Decisions**\r\n\r\n| Decision | Choice | Industry Reference |\r\n|----------|--------|--------------------|\r\n| Haptics configurable | Simple on/off toggle in Settings | Telegram |\r\n| Long-press duration | 500ms (iOS standard) | iOS system default |\r\n| Scope | 1:1 conversations only | - |

---

## 🧩 **Implementation Tasks**

### **Phase 1: Haptic Service** (0.25 days)

#### Task 1.1: Create HapticService

```typescript
// src/services/hapticService.ts
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

class HapticService {
  private isNative: boolean;
  private isEnabled: boolean = true;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Enable/disable haptics
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Trigger haptic feedback
   */
  async trigger(type: HapticType): Promise<void> {
    if (!this.isNative || !this.isEnabled) return;

    try {
      switch (type) {
        case "light":
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case "medium":
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case "heavy":
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case "success":
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case "warning":
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case "error":
          await Haptics.notification({ type: NotificationType.Error });
          break;
        case "selection":
          await Haptics.selectionStart();
          await Haptics.selectionChanged();
          await Haptics.selectionEnd();
          break;
      }
    } catch (error) {
      console.warn("Haptic feedback failed:", error);
    }
  }

  /**
   * Trigger haptic for specific messaging actions
   */
  async onMessageSent(): Promise<void> {
    await this.trigger("light");
  }

  async onReactionAdded(): Promise<void> {
    await this.trigger("light");
  }

  async onReactionRemoved(): Promise<void> {
    await this.trigger("selection");
  }

  async onLongPress(): Promise<void> {
    await this.trigger("medium");
  }

  async onEditStart(): Promise<void> {
    await this.trigger("light");
  }

  async onEditSaved(): Promise<void> {
    await this.trigger("success");
  }

  async onDeleteConfirm(): Promise<void> {
    await this.trigger("warning");
  }

  async onDeleteUndo(): Promise<void> {
    await this.trigger("success");
  }

  async onError(): Promise<void> {
    await this.trigger("error");
  }
}

export const hapticService = new HapticService();
```

---

### **Phase 2: Long-Press Hook** (0.25 days)

#### Task 2.1: Create Enhanced useLongPress Hook

```typescript
// src/hooks/useLongPress.ts
import { useRef, useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { hapticService } from "../services/hapticService";

interface LongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  threshold?: number; // Default 500ms
  moveThreshold?: number; // Cancel if finger moves > Xpx
}

interface LongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  isLongPressing: boolean;
}

export function useLongPress({
  onLongPress,
  onPress,
  threshold = 500,
  moveThreshold = 10,
}: LongPressOptions): LongPressResult {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [isLongPressing, setIsLongPressing] = useState(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setIsLongPressing(false);
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      isLongPressRef.current = false;
      startPosRef.current = { x, y };

      timerRef.current = setTimeout(async () => {
        isLongPressRef.current = true;
        setIsLongPressing(true);

        // Haptic feedback on mobile
        await hapticService.onLongPress();

        onLongPress();
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const handleEnd = useCallback(() => {
    clear();
    if (!isLongPressRef.current && onPress) {
      onPress();
    }
    isLongPressRef.current = false;
  }, [clear, onPress]);

  const handleMove = useCallback(
    (x: number, y: number) => {
      // Cancel if finger moved too far
      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);

      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
      }
    },
    [clear, moveThreshold]
  );

  // Mouse events (web)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    clear();
  }, [clear]);

  // Touch events (mobile)
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    isLongPressing,
  };
}
```

---

### **Phase 3: Native Action Sheet** (0.25 days)

#### Task 3.1: Create MessageActionSheet Component

```typescript
// src/components/messaging/MessageActionSheet.tsx
import React from 'react';
import { Capacitor } from '@capacitor/core';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Edit2, Trash2, Copy, Reply, Smile, Pin, Forward } from 'lucide-react';

export interface ActionSheetAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  editRemainingTime?: string;
}

export function MessageActionSheet({
  isOpen,
  onClose,
  onAction,
  canEdit,
  canDelete,
  editRemainingTime
}: Props) {
  // Use native action sheet on mobile
  React.useEffect(() => {
    if (!isOpen) return;

    if (Capacitor.isNativePlatform()) {
      showNativeActionSheet();
    }
  }, [isOpen]);

  const showNativeActionSheet = async () => {
    const options: any[] = [
      { title: '❤️ React' },
      { title: '↩️ Reply' },
      { title: '📋 Copy' },
    ];

    if (canEdit) {
      options.push({ title: `✏️ Edit (${editRemainingTime})` });
    }
    if (canDelete) {
      options.push({
        title: `🗑️ Delete (${editRemainingTime})`,
        style: ActionSheetButtonStyle.Destructive
      });
    }

    options.push({
      title: 'Cancel',
      style: ActionSheetButtonStyle.Cancel
    });

    const result = await ActionSheet.showActions({
      title: 'Message Actions',
      options
    });

    if (result.index === options.length - 1) {
      onClose();
      return;
    }

    const actionMap = ['react', 'reply', 'copy'];
    if (canEdit) actionMap.push('edit');
    if (canDelete) actionMap.push('delete');

    const selectedAction = actionMap[result.index];
    if (selectedAction) {
      onAction(selectedAction);
    }
    onClose();
  };

  // Web fallback - styled bottom sheet
  if (!Capacitor.isNativePlatform()) {
    if (!isOpen) return null;

    const actions: ActionSheetAction[] = [
      { id: 'react', label: 'React', icon: <Smile className="w-5 h-5" /> },
      { id: 'reply', label: 'Reply', icon: <Reply className="w-5 h-5" /> },
      { id: 'copy', label: 'Copy', icon: <Copy className="w-5 h-5" /> },
    ];

    if (canEdit) {
      actions.push({
        id: 'edit',
        label: `Edit (${editRemainingTime})`,
        icon: <Edit2 className="w-5 h-5" />
      });
    }

    if (canDelete) {
      actions.push({
        id: 'delete',
        label: `Delete (${editRemainingTime})`,
        icon: <Trash2 className="w-5 h-5" />,
        destructive: true
      });
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />

        {/* Sheet */}
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 animate-slide-up">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-3" />

          <div className="px-4 pb-safe">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  onAction(action.id);
                  onClose();
                }}
                disabled={action.disabled}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-lg
                  ${action.destructive
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {action.icon}
                <span className="font-medium">{action.label}</span>
              </button>
            ))}

            <button
              onClick={onClose}
              className="w-full py-3 mt-2 mb-4 text-gray-500 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
```

#### Task 3.2: Add Slide-Up Animation

```css
/* src/index.css (additions) */
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

/* Safe area padding for iOS */
.pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

---

### **Phase 4: Integration** (0.25 days)

#### Task 4.1: Update MessageBubble with Gestures

```typescript
// src/components/messaging/MessageBubble.tsx (complete integration)
import React, { useState } from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import { MessageActionSheet } from './MessageActionSheet';
import { useEditMessage } from '../../hooks/useEditMessage';
import { useDeleteMessage } from '../../hooks/useDeleteMessage';
import { hapticService } from '../../services/hapticService';

export function MessageBubble({ message, isOwnMessage, currentUserId }) {
  const [showActionSheet, setShowActionSheet] = useState(false);

  const { canEdit, remainingTime: editTime, setIsEditing } = useEditMessage(message.id);
  const { canDelete, remainingTime: deleteTime, setShowConfirmDialog } = useDeleteMessage(message.id);

  // Long-press to show actions
  const longPressProps = useLongPress({
    onLongPress: () => {
      setShowActionSheet(true);
    },
    threshold: 500
  });

  const handleAction = async (actionId: string) => {
    switch (actionId) {
      case 'react':
        // Show reaction picker
        break;
      case 'reply':
        // Set reply-to message
        break;
      case 'copy':
        await navigator.clipboard.writeText(message.content);
        hapticService.trigger('success');
        break;
      case 'edit':
        setIsEditing(true);
        hapticService.onEditStart();
        break;
      case 'delete':
        setShowConfirmDialog(true);
        break;
    }
  };

  return (
    <>
      <div
        {...longPressProps}
        className={`
          message-bubble
          ${longPressProps.isLongPressing ? 'scale-95 opacity-90' : ''}
          transition-transform
        `}
      >
        {/* Message content */}
        <p>{message.content}</p>
      </div>

      {/* Action sheet */}
      <MessageActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onAction={handleAction}
        canEdit={canEdit && isOwnMessage}
        canDelete={canDelete && isOwnMessage}
        editRemainingTime={editTime}
      />
    </>
  );
}
```

---

## 🧪 **Testing Plan**

### **Manual Testing Checklist**

#### iOS Device

- [ ] Long-press triggers haptic (medium)
- [ ] Action sheet shows native iOS style
- [ ] Reaction adds light haptic
- [ ] Delete confirm shows warning haptic
- [ ] Gestures work smoothly

#### Android Device

- [ ] Long-press triggers vibration
- [ ] Bottom sheet shows Material style
- [ ] Reaction adds vibration pattern
- [ ] Delete confirm shows buzz pattern
- [ ] Gestures work smoothly

#### Web Browser

- [ ] Long-press shows styled bottom sheet
- [ ] No haptic errors in console
- [ ] Hover actions work as fallback

### **MCP Integration Tests**

```bash
# Test on mobile emulator
warp mcp run puppeteer "e2e test on mobile viewport: long-press message, verify action sheet appears"
```

---

## ✅ **Definition of Done**

- [ ] HapticService with all feedback types
- [ ] useLongPress hook with gesture detection
- [ ] MessageActionSheet with native/web variants
- [ ] Integration with MessageBubble
- [ ] Haptics on: send, react, edit, delete
- [ ] Native action sheet on iOS/Android
- [ ] Web fallback bottom sheet
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] Tested on web browser

---

**Next Story:** [STORY_8.5.7_Pin_Messages.md](./STORY_8.5.7_Pin_Messages.md)
