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

  async onSwipeSnap(): Promise<void> { // For swipe gestures
    await this.trigger("selection");
  }
}

export const hapticService = new HapticService();
