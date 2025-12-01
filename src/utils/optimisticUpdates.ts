import { toast } from "react-hot-toast";

export class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, any>();

  /**
   * Apply optimistic update
   */
  applyOptimistic<T>(id: string, update: Partial<T>, rollback: T): void {
    this.pendingUpdates.set(id, rollback);
    console.log("⚡ Optimistic update applied:", id);
  }

  /**
   * Confirm update (server responded)
   */
  confirmUpdate(id: string): void {
    this.pendingUpdates.delete(id);
    console.log("✅ Optimistic update confirmed:", id);
  }

  /**
   * Rollback update (server failed)
   */
  rollbackUpdate(id: string): any {
    const rollback = this.pendingUpdates.get(id);
    this.pendingUpdates.delete(id);

    if (rollback) {
      console.log("↩️ Optimistic update rolled back:", id);
      toast.error("Action failed, rolling back");
    }

    return rollback;
  }

  /**
   * Clear all pending updates
   */
  clearAll(): void {
    this.pendingUpdates.clear();
  }
}

export const optimisticUpdates = new OptimisticUpdateManager();
