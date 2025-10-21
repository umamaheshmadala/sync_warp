/**
 * UUID Helper Utilities for Supabase Development
 * 
 * These utilities make working with UUIDs more human-friendly
 * by providing short IDs, display names, and lookup functionality.
 */

export interface UUIDEntity {
  id: string;
  name?: string;
  title?: string;
  display_name?: string;
  full_name?: string;
}

export const uuidHelpers = {
  /**
   * Get short UUID (first 8 characters) for display
   * @param uuid - Full UUID string
   * @returns Short UUID (e.g., "e160c3aa")
   */
  getShortId: (uuid: string): string => {
    if (!uuid) return '';
    return uuid.substring(0, 8);
  },

  /**
   * Create display name with short ID for debugging
   * @param uuid - Full UUID string
   * @param name - Human readable name
   * @returns Display name with short ID (e.g., "Starbucks (e160c3aa)")
   */
  createDisplayId: (uuid: string, name: string): string => {
    if (!uuid || !name) return name || uuid || '';
    return `${name} (${uuid.substring(0, 8)})`;
  },

  /**
   * Format UUID for debugging console logs
   * @param uuid - Full UUID string
   * @param context - Optional context label
   * @returns Debug-friendly format (e.g., "Business ID: e160c3aa...2c3d")
   */
  formatForDebug: (uuid: string, context = 'ID'): string => {
    if (!uuid) return `${context}: [empty]`;
    if (uuid.length < 8) return `${context}: ${uuid}`;
    return `${context}: ${uuid.substring(0, 8)}...${uuid.slice(-4)}`;
  },

  /**
   * Create a lookup map for entities with both full and short ID keys
   * @param items - Array of entities with id property
   * @returns Map with both full UUID and short UUID as keys
   */
  createLookupMap: <T extends UUIDEntity>(items: T[]): Map<string, T> => {
    const map = new Map<string, T>();
    
    items.forEach(item => {
      if (item.id) {
        // Full UUID lookup
        map.set(item.id, item);
        // Short UUID lookup
        map.set(item.id.substring(0, 8), item);
      }
    });
    
    return map;
  },

  /**
   * Get display name from various name fields
   * @param entity - Entity with possible name fields
   * @returns Best available name or fallback
   */
  getDisplayName: (entity: UUIDEntity): string => {
    return (
      entity.display_name ||
      entity.name ||
      entity.title ||
      entity.full_name ||
      (entity.id ? uuidHelpers.getShortId(entity.id) : 'Unknown')
    );
  },

  /**
   * Create relationship debug string
   * @param parentType - Type of parent entity
   * @param parentId - Parent UUID
   * @param childType - Type of child entity  
   * @param childId - Child UUID
   * @returns Debug string showing relationship
   */
  relationshipDebug: (
    parentType: string,
    parentId: string,
    childType: string,
    childId: string
  ): string => {
    return `${parentType}(${uuidHelpers.getShortId(parentId)}) -> ${childType}(${uuidHelpers.getShortId(childId)})`;
  },

  /**
   * Validate UUID format
   * @param uuid - String to validate
   * @returns true if valid UUID format
   */
  isValidUUID: (uuid: string): boolean => {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * Extract all UUIDs from an object
   * @param obj - Object that might contain UUIDs
   * @returns Array of found UUIDs with their field names
   */
  extractUUIDs: (obj: Record<string, any>): Array<{ field: string; uuid: string; shortId: string }> => {
    const uuids: Array<{ field: string; uuid: string; shortId: string }> = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && uuidHelpers.isValidUUID(value)) {
        uuids.push({
          field: key,
          uuid: value,
          shortId: uuidHelpers.getShortId(value)
        });
      }
    });
    
    return uuids;
  }
};

/**
 * Enhanced console logging for development
 * Use these for better debugging of UUID relationships
 */
export const debugLog = {
  /**
   * Log relationship between entities
   */
  relationship: (parentType: string, parentId: string, childType: string, childId: string) => {
    console.log(
      `🔗 ${uuidHelpers.relationshipDebug(parentType, parentId, childType, childId)}`
    );
  },

  /**
   * Log database query with UUID-friendly formatting
   */
  query: (tableName: string, conditions: Record<string, any>) => {
    const formattedConditions = Object.entries(conditions)
      .map(([key, value]) => {
        if (typeof value === 'string' && value.length > 20) {
          return `${key}=${uuidHelpers.getShortId(value)}...`;
        }
        return `${key}=${value}`;
      })
      .join(', ');
    
    console.log(`🔍 Querying ${tableName}: ${formattedConditions}`);
  },

  /**
   * Log query results with sample data
   */
  result: (tableName: string, count: number, sample?: any) => {
    console.log(`📊 ${tableName}: ${count} results`);
    if (sample && process.env.NODE_ENV === 'development') {
      console.log('Sample:', {
        ...sample,
        ...(sample.id ? { shortId: uuidHelpers.getShortId(sample.id) } : {})
      });
    }
  },

  /**
   * Log all UUIDs in an object for debugging
   */
  uuids: (obj: Record<string, any>, label = 'Object') => {
    const uuids = uuidHelpers.extractUUIDs(obj);
    if (uuids.length > 0) {
      console.log(`🆔 ${label} UUIDs:`, uuids);
    }
  }
};

/**
 * Client-side cache for UUID to name lookups
 * Reduces API calls when displaying entity names
 */
class UUIDCache {
  private cache = new Map<string, string>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private timestamps = new Map<string, number>();

  /**
   * Get name for a UUID, with caching
   */
  async getName(uuid: string, tableName: string): Promise<string> {
    const shortId = uuidHelpers.getShortId(uuid);
    const cacheKey = `${tableName}:${shortId}`;
    
    // Check cache and TTL
    const cached = this.cache.get(cacheKey);
    const timestamp = this.timestamps.get(cacheKey);
    
    if (cached && timestamp && (Date.now() - timestamp < this.TTL)) {
      return cached;
    }

    try {
      // Note: This would need to be implemented with your Supabase client
      // const { data } = await supabase
      //   .from(`${tableName}_readable`)
      //   .select('display_name')
      //   .eq('short_id', shortId)
      //   .single();

      // For now, return short ID as fallback
      const displayName = shortId; // Would be data.display_name in real implementation
      
      this.cache.set(cacheKey, displayName);
      this.timestamps.set(cacheKey, Date.now());
      
      return displayName;
    } catch (error) {
      console.warn(`Failed to fetch name for ${tableName}:${shortId}`, error);
      return shortId;
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp >= this.TTL) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton cache instance
export const uuidCache = new UUIDCache();

// Cleanup cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    uuidCache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * React hook for UUID display names
 * Usage: const displayName = useUUIDName(businessId, 'businesses');
 */
export const useUUIDName = (uuid: string, tableName: string) => {
  // This would be implemented as a React hook in a real application
  // For now, it's just a placeholder showing the pattern
  return uuidHelpers.getShortId(uuid);
};

export default uuidHelpers;