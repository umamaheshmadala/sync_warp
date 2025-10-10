# Epic 3: Full Compliance Implementation Plan

**Project:** SynC (sync_warp)  
**Target:** 100% Compliance with Enhanced Project Brief v2.0 & Mermaid Chart v2  
**Current Status:** 65% Compliant  
**Timeline:** 2-3 weeks (10-15 working days)  
**Priority:** HIGH - Production Blockers Present

---

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Critical Features (Week 1)](#phase-1-critical-features-week-1)
3. [Phase 2: API Integration (Week 2)](#phase-2-api-integration-week-2)
4. [Phase 3: Polish & Testing (Week 2-3)](#phase-3-polish--testing-week-2-3)
5. [File Structure](#file-structure)
6. [Code Templates](#code-templates)
7. [Testing Checklist](#testing-checklist)

---

## Overview

### What Needs to be Built

| Feature | Priority | Estimated Time | Blocker? |
|---------|----------|----------------|----------|
| Ad Slots Carousel | 🔴 CRITICAL | 2 days | ✅ YES (Revenue) |
| City Picker Modal | 🔴 CRITICAL | 1.5 days | ✅ YES (Pricing) |
| Notification Deep-linking | 🔴 CRITICAL | 1.5 days | ✅ YES (Engagement) |
| New Businesses Section | 🔴 CRITICAL | 1 day | ✅ YES (Discovery) |
| Replace Mock Data | 🟠 HIGH | 2 days | ✅ YES (Content) |
| User Activity Card | 🟠 HIGH | 1 day | ❌ NO |
| Notification Settings | 🟡 MEDIUM | 0.5 days | ❌ NO |
| Loading/Empty States | 🟡 MEDIUM | 0.5 days | ❌ NO |

**Total Effort:** 10-12 working days

---

## Phase 1: Critical Features (Week 1)

### Day 1-2: Ad Slots Carousel System

#### 1.1 Create Type Definitions

**File:** `src/types/ads.ts`

```typescript
// src/types/ads.ts
export interface Ad {
  id: string;
  business_id: string;
  business_name: string;
  type: 'banner' | 'carousel' | 'search' | 'trending';
  title: string;
  description?: string;
  image_url?: string;
  cta_text?: string;
  cta_url?: string;
  priority: number;
  start_date: string;
  end_date: string;
  daily_budget: number; // ₹500/day for banner
  impressions: number;
  clicks: number;
  created_at: string;
}

export interface OrganicContent {
  id: string;
  type: 'business' | 'offer' | 'product';
  title: string;
  description?: string;
  image_url?: string;
  cta_text: string;
  cta_url: string;
  priority: number;
}

export interface AdSlotData {
  position: number; // 1-6
  content_type: 'paid_ad' | 'organic';
  ad?: Ad;
  organic?: OrganicContent;
}
```

#### 1.2 Create Ad Slot Component

**File:** `src/components/ads/AdSlot.tsx`

```typescript
// src/components/ads/AdSlot.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp } from 'lucide-react';
import type { AdSlotData } from '../../types/ads';

interface AdSlotProps {
  slot: AdSlotData;
  onAdClick: (adId: string) => void;
  onImpression: (adId: string) => void;
}

const AdSlot: React.FC<AdSlotProps> = ({ slot, onAdClick, onImpression }) => {
  const content = slot.ad || slot.organic;
  const isOrganic = slot.content_type === 'organic';

  // Track impression on mount
  React.useEffect(() => {
    if (slot.ad) {
      onImpression(slot.ad.id);
    }
  }, [slot.ad, onImpression]);

  const handleClick = () => {
    if (slot.ad) {
      onAdClick(slot.ad.id);
      // Navigate to CTA URL
      if (slot.ad.cta_url) {
        window.location.href = slot.ad.cta_url;
      }
    } else if (slot.organic) {
      window.location.href = slot.organic.cta_url;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Organic Label */}
      {isOrganic && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Recommended
          </span>
        </div>
      )}

      {/* Promoted Label */}
      {!isOrganic && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
            ✨ Sponsored
          </span>
        </div>
      )}

      <button
        onClick={handleClick}
        className="w-full bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
      >
        {/* Image Section */}
        <div className="h-48 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative flex items-center justify-center">
          {content?.image_url ? (
            <img 
              src={content.image_url} 
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <TrendingUp className="w-16 h-16 text-indigo-400" />
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
            {content?.title}
          </h3>
          {content?.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {content.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-600 font-medium">
              {content?.cta_text || 'Learn More'}
            </span>
            <ExternalLink className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
      </button>
    </motion.div>
  );
};

export default AdSlot;
```

#### 1.3 Create Ad Carousel Component

**File:** `src/components/ads/AdCarousel.tsx`

```typescript
// src/components/ads/AdCarousel.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AdSlot from './AdSlot';
import { useAdSlots } from '../../hooks/useAdSlots';

const AdCarousel: React.FC = () => {
  const { slots, loading, trackImpression, trackClick } = useAdSlots();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!autoplay || slots.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slots.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoplay, slots.length]);

  const goToPrevious = () => {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev - 1 + slots.length) % slots.length);
  };

  const goToNext = () => {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev + 1) % slots.length);
  };

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
    );
  }

  if (slots.length === 0) {
    return null; // Or show fallback content
  }

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <AdSlot
              slot={slots[currentIndex]}
              onAdClick={trackClick}
              onImpression={trackImpression}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {slots.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
              aria-label="Previous ad"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
              aria-label="Next ad"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Indicators */}
      {slots.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {slots.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoplay(false);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-indigo-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdCarousel;
```

#### 1.4 Create Ad Slots Hook

**File:** `src/hooks/useAdSlots.ts`

```typescript
// src/hooks/useAdSlots.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { AdSlotData, Ad, OrganicContent } from '../types/ads';

export function useAdSlots() {
  const { profile } = useAuthStore();
  const [slots, setSlots] = useState<AdSlotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdSlots();
  }, [profile?.city]);

  const fetchAdSlots = async () => {
    try {
      setLoading(true);

      // Fetch active ads for user's city
      const { data: ads, error } = await supabase
        .from('ads')
        .select('*')
        .eq('type', 'carousel')
        .eq('status', 'active')
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('priority', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Fill empty slots with organic content
      const adSlots: AdSlotData[] = [];
      const totalSlots = 6;

      // Add paid ads first
      (ads || []).forEach((ad, index) => {
        adSlots.push({
          position: index + 1,
          content_type: 'paid_ad',
          ad: ad as Ad,
        });
      });

      // Fill remaining slots with organic content
      if (adSlots.length < totalSlots) {
        const organicContent = await fetchOrganicFallbacks(
          totalSlots - adSlots.length
        );
        organicContent.forEach((organic, index) => {
          adSlots.push({
            position: adSlots.length + index + 1,
            content_type: 'organic',
            organic,
          });
        });
      }

      setSlots(adSlots);
    } catch (error) {
      console.error('Error fetching ad slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganicFallbacks = async (
    limit: number
  ): Promise<OrganicContent[]> => {
    try {
      // Fetch trending businesses or offers as organic content
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, business_name, description, image_url')
        .eq('status', 'active')
        .order('average_rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (businesses || []).map((business, index) => ({
        id: business.id,
        type: 'business' as const,
        title: business.business_name,
        description: business.description,
        image_url: business.image_url,
        cta_text: 'View Business',
        cta_url: `/business/${business.id}`,
        priority: index,
      }));
    } catch (error) {
      console.error('Error fetching organic fallbacks:', error);
      return [];
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_impression', { ad_id: adId });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_click', { ad_id: adId });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return {
    slots,
    loading,
    trackImpression,
    trackClick,
    refresh: fetchAdSlots,
  };
}
```

#### 1.5 Integrate Ad Carousel into Dashboard

**File:** `src/components/Dashboard.tsx` (modifications)

```typescript
// Add import
import AdCarousel from './ads/AdCarousel';

// Add after Welcome Banner (around line 130)
{/* Ad Carousel Section */}
<section className="mb-8">
  <AdCarousel />
</section>
```

---

### Day 3-4: City Picker Modal

#### 2.1 Create City Type Definitions

**File:** `src/types/location.ts`

```typescript
// src/types/location.ts
export interface City {
  id: string;
  name: string;
  state: string;
  tier: 1 | 2 | 3;
  latitude: number;
  longitude: number;
  population?: number;
}

export interface CityGroup {
  tier: 1 | 2 | 3;
  cities: City[];
}
```

#### 2.2 Create City Picker Modal Component

**File:** `src/components/location/CityPicker.tsx`

```typescript
// src/components/location/CityPicker.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Search, MapPin, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCities } from '../../hooks/useCities';
import { useAuthStore } from '../../store/authStore';
import type { City } from '../../types/location';

interface CityPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: City) => void;
}

const CityPicker: React.FC<CityPickerProps> = ({ isOpen, onClose, onCitySelect }) => {
  const { cities, loading } = useCities();
  const { profile, updateProfile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  // Filter cities based on search and tier
  const filteredCities = useMemo(() => {
    let filtered = cities;

    // Filter by tier
    if (selectedTier) {
      filtered = filtered.filter(city => city.tier === selectedTier);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        city =>
          city.name.toLowerCase().includes(query) ||
          city.state.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [cities, searchQuery, selectedTier]);

  // Group cities by tier
  const cityGroups = useMemo(() => {
    const groups: Record<number, City[]> = { 1: [], 2: [], 3: [] };
    filteredCities.forEach(city => {
      groups[city.tier].push(city);
    });
    return groups;
  }, [filteredCities]);

  const handleCitySelect = async (city: City) => {
    try {
      setUpdating(true);

      // Update profile with new city
      await updateProfile({ city: city.name });

      // Callback
      if (onCitySelect) {
        onCitySelect(city);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error updating city:', error);
      alert('Failed to update city. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getTierLabel = (tier: number): string => {
    switch (tier) {
      case 1:
        return 'Metro Cities';
      case 2:
        return 'Major Cities';
      case 3:
        return 'Growing Cities';
      default:
        return '';
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-white flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Select Your City
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-indigo-200 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Current City */}
                  {profile?.city && (
                    <p className="text-sm text-indigo-200 mt-2">
                      Current: {profile.city}
                    </p>
                  )}
                </div>

                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cities..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Tier Filters */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setSelectedTier(null)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTier === null
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Cities
                    </button>
                    {[1, 2, 3].map(tier => (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTier === tier
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Tier {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cities List */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {[1, 2, 3].map(tier => {
                        const tierCities = cityGroups[tier];
                        if (tierCities.length === 0) return null;

                        return (
                          <div key={tier} className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                              {getTierLabel(tier)}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              {tierCities.map(city => (
                                <motion.button
                                  key={city.id}
                                  onClick={() => handleCitySelect(city)}
                                  disabled={updating}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                    profile?.city === city.name
                                      ? 'border-indigo-600 bg-indigo-50'
                                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="text-left">
                                    <p className="font-medium text-gray-900">{city.name}</p>
                                    <p className="text-xs text-gray-500">{city.state}</p>
                                  </div>
                                  {profile?.city === city.name && (
                                    <Check className="w-5 h-5 text-indigo-600" />
                                  )}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {filteredCities.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No cities found matching "{searchQuery}"</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default CityPicker;
```

#### 2.3 Create Cities Hook

**File:** `src/hooks/useCities.ts`

```typescript
// src/hooks/useCities.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { City } from '../types/location';

export function useCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('indian_cities')
        .select('*')
        .order('tier', { ascending: true })
        .order('population', { ascending: false });

      if (error) throw error;

      setCities((data || []) as City[]);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    cities,
    loading,
    refresh: fetchCities,
  };
}
```

#### 2.4 Update Layout to Use City Picker

**File:** `src/components/Layout.tsx` (modifications)

```typescript
// Add import
import CityPicker from './location/CityPicker';

// Add state
const [showCityPicker, setShowCityPicker] = useState(false);

// Replace empty onClick handler (around line 115)
onClick={() => setShowCityPicker(true)}

// Add before closing Layout component (around line 226)
{/* City Picker Modal */}
<CityPicker
  isOpen={showCityPicker}
  onClose={() => setShowCityPicker(false)}
  onCitySelect={(city) => {
    console.log('City selected:', city);
    // Context will be updated automatically via profile update
  }}
/>
```

---

### Day 5: Notification Deep-linking System

#### 3.1 Create Notification Types

**File:** `src/types/notifications.ts`

```typescript
// src/types/notifications.ts
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'coupon_shared'
  | 'coupon_expiring'
  | 'review_received'
  | 'business_update'
  | 'product_update'
  | 'offer_available';

export type NotificationTarget =
  | 'storefront'
  | 'product'
  | 'wallet'
  | 'feed'
  | 'profile'
  | 'coupon';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  target: NotificationTarget;
  target_id: string; // ID of the business/product/coupon/user
  title: string;
  message: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}
```

#### 3.2 Create Notification Service

**File:** `src/services/notificationService.ts`

```typescript
// src/services/notificationService.ts
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/notifications';

export const notificationService = {
  // Fetch user notifications
  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as Notification[];
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Mark all as read
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  },
};
```

#### 3.3 Create Notification Router Utility

**File:** `src/utils/notificationRouter.ts`

```typescript
// src/utils/notificationRouter.ts
import { NavigateFunction } from 'react-router-dom';
import type { Notification } from '../types/notifications';

export function routeToNotificationTarget(
  notification: Notification,
  navigate: NavigateFunction
): void {
  // Mark as read first
  markNotificationAsRead(notification.id);

  // Route based on target type
  switch (notification.target) {
    case 'storefront':
      navigate(`/business/${notification.target_id}`);
      break;

    case 'product':
      navigate(`/product/${notification.target_id}`);
      break;

    case 'wallet':
      navigate('/wallet', {
        state: { highlightCoupon: notification.target_id },
      });
      break;

    case 'coupon':
      navigate('/wallet', {
        state: { openCoupon: notification.target_id },
      });
      break;

    case 'feed':
      navigate('/social', {
        state: { scrollToActivity: notification.target_id },
      });
      break;

    case 'profile':
      navigate(`/profile/${notification.target_id}`);
      break;

    default:
      console.warn('Unknown notification target:', notification.target);
  }
}

async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { notificationService } = await import('../services/notificationService');
    await notificationService.markAsRead(notificationId);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}
```

#### 3.4 Update NotificationHub Component

**File:** `src/components/NotificationHub.tsx` (complete rewrite)

```typescript
// src/components/NotificationHub.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Bell, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { notificationService } from '../services/notificationService';
import { routeToNotificationTarget } from '../utils/notificationRouter';
import type { Notification } from '../types/notifications';

interface NotificationHubProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationHub: React.FC<NotificationHubProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
      
      // Subscribe to real-time notifications
      const subscription = notificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications(user.id);
      setNotifications(data);
      
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Route to target
    routeToNotificationTarget(notification, navigate);
    
    // Update unread count
    if (!notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    }
    
    // Close modal
    onClose();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      friend_request: '👥',
      friend_accepted: '✅',
      coupon_shared: '🎟️',
      coupon_expiring: '⏰',
      review_received: '⭐',
      business_update: '🏪',
      product_update: '📦',
      offer_available: '🔥',
    };
    return icons[type] || '🔔';
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-indigo-600 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-white mr-2" />
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-indigo-200 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mark all as read button */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="mt-3 text-sm text-indigo-200 hover:text-white flex items-center"
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-2">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.button
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                    !notification.is_read ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    {/* Icon */}
                    <div className="text-2xl mr-3 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 mb-1">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full ml-2 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationHub;
```

---

## Phase 2: API Integration (Week 2)

### Day 6-7: New Businesses Section & Replace Mock Data

#### 4.1 Create Dashboard Service

**File:** `src/services/dashboardService.ts`

```typescript
// src/services/dashboardService.ts
import { supabase } from '../lib/supabase';

export interface BusinessCard {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isPromoted?: boolean;
  created_at?: string;
}

export interface OfferCard {
  id: string;
  title: string;
  businessName: string;
  discount: string;
  expiresIn: string;
  imageUrl: string;
}

export interface ProductCard {
  id: string;
  name: string;
  business: string;
  price: string;
}

export const dashboardService = {
  // Fetch Spotlight Businesses
  async getSpotlightBusinesses(city: string, limit = 5): Promise<BusinessCard[]> {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        business_name,
        category,
        address,
        average_rating,
        review_count,
        image_url,
        created_at
      `)
      .eq('city', city)
      .eq('status', 'active')
      .order('average_rating', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(b => ({
      id: b.id,
      name: b.business_name,
      category: b.category,
      location: b.address,
      rating: b.average_rating || 0,
      reviewCount: b.review_count || 0,
      imageUrl: b.image_url || '',
      created_at: b.created_at,
    }));
  },

  // Fetch Hot Offers
  async getHotOffers(city: string, limit = 5): Promise<OfferCard[]> {
    const { data, error } = await supabase
      .from('business_coupons')
      .select(`
        id,
        title,
        description,
        discount_value,
        discount_type,
        valid_until,
        business:businesses(business_name)
      `)
      .eq('status', 'active')
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(offer => {
      const daysLeft = Math.ceil(
        (new Date(offer.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: offer.id,
        title: offer.title,
        businessName: offer.business?.business_name || 'Unknown',
        discount: offer.discount_type === 'percentage'
          ? `${offer.discount_value}%`
          : `₹${offer.discount_value}`,
        expiresIn: `${daysLeft} days`,
        imageUrl: '',
      };
    });
  },

  // Fetch Trending Products
  async getTrendingProducts(limit = 5): Promise<ProductCard[]> {
    const { data, error } = await supabase
      .from('business_products')
      .select(`
        id,
        name,
        price,
        business:businesses(business_name)
      `)
      .eq('status', 'active')
      .order('views', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(product => ({
      id: product.id,
      name: product.name,
      business: product.business?.business_name || 'Unknown',
      price: `₹${product.price}`,
    }));
  },

  // Fetch New Businesses/Events
  async getNewBusinesses(city: string, limit = 5): Promise<BusinessCard[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        business_name,
        category,
        address,
        average_rating,
        review_count,
        image_url,
        created_at
      `)
      .eq('city', city)
      .eq('status', 'active')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(b => ({
      id: b.id,
      name: b.business_name,
      category: b.category,
      location: b.address,
      rating: b.average_rating || 0,
      reviewCount: b.review_count || 0,
      imageUrl: b.image_url || '',
      created_at: b.created_at,
    }));
  },
};
```

#### 4.2 Update Dashboard Component

**File:** `src/components/Dashboard.tsx` (major refactor)

```typescript
// Replace mock data states with real data
const [spotlightBusinesses, setSpotlightBusinesses] = useState<BusinessCard[]>([]);
const [hotOffers, setHotOffers] = useState<OfferCard[]>([]);
const [trendingProducts, setTrendingProducts] = useState<ProductCard[]>([]);
const [newBusinesses, setNewBusinesses] = useState<BusinessCard[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Fetch all dashboard data
useEffect(() => {
  fetchDashboardData();
}, [profile?.city]);

const fetchDashboardData = async () => {
  if (!profile?.city) return;

  try {
    setLoading(true);
    setError(null);

    const [spotlight, offers, products, newBiz] = await Promise.all([
      dashboardService.getSpotlightBusinesses(profile.city, 5),
      dashboardService.getHotOffers(profile.city, 5),
      dashboardService.getTrendingProducts(5),
      dashboardService.getNewBusinesses(profile.city, 5),
    ]);

    setSpotlightBusinesses(spotlight);
    setHotOffers(offers);
    setTrendingProducts(products);
    setNewBusinesses(newBiz);
  } catch (err: any) {
    console.error('Error fetching dashboard data:', err);
    setError('Failed to load dashboard. Please try again.');
  } finally {
    setLoading(false);
  }
};

// Add New Businesses section after Trending Products
{/* New Businesses & Events */}
<section className="mb-8">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900">New in Your City 🆕</h2>
      <p className="text-base text-gray-600">Discover recently opened businesses</p>
    </div>
  </div>
  
  {newBusinesses.length === 0 ? (
    <div className="text-center py-12 bg-white rounded-2xl">
      <p className="text-gray-500">No new businesses in your area yet</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {newBusinesses.map((business) => (
        <div
          key={business.id}
          onClick={() => navigate(`/business/${business.id}`)}
          className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 relative"
        >
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
              🆕 New
            </span>
          </div>
          
          {/* Similar structure to spotlight businesses */}
          {/* ... rest of card UI ... */}
        </div>
      ))}
    </div>
  )}
</section>
```

---

### Day 8: User Activity Card

#### 5.1 Create User Activity Card Component

**File:** `src/components/dashboard/UserActivityCard.tsx`

```typescript
// src/components/dashboard/UserActivityCard.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface Activity {
  id: string;
  type: 'share' | 'collect' | 'review' | 'follow';
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

const UserActivityCard: React.FC = () => {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({
    shares: 0,
    reviews: 0,
    favorites: 0,
    friends: 0,
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchRecentActivities();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch user statistics
      const [sharesCount, reviewsCount, favoritesCount, friendsCount] = await Promise.all([
        supabase.from('coupon_sharing_log').select('*', { count: 'exact', head: true }).eq('sender_id', user.id),
        supabase.from('business_reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_favorites_businesses').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('friend_connections').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'accepted'),
      ]);

      setStats({
        shares: sharesCount.count || 0,
        reviews: reviewsCount.count || 0,
        favorites: favoritesCount.count || 0,
        friends: friendsCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchRecentActivities = async () => {
    if (!user) return;

    try {
      // Fetch recent activities (last 5)
      const recentActivities: Activity[] = [];

      // Get recent shares
      const { data: shares } = await supabase
        .from('coupon_sharing_log')
        .select('*, coupon:business_coupons(title)')
        .eq('sender_id', user.id)
        .order('shared_at', { ascending: false })
        .limit(2);

      shares?.forEach(share => {
        recentActivities.push({
          id: share.id,
          type: 'share',
          description: `Shared ${share.coupon?.title || 'a coupon'}`,
          timestamp: share.shared_at,
          icon: <Share2 className="w-4 h-4" />,
        });
      });

      // Get recent reviews
      const { data: reviews } = await supabase
        .from('business_reviews')
        .select('*, business:businesses(business_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      reviews?.forEach(review => {
        recentActivities.push({
          id: review.id,
          type: 'review',
          description: `Reviewed ${review.business?.business_name || 'a business'}`,
          timestamp: review.created_at,
          icon: <MessageCircle className="w-4 h-4" />,
        });
      });

      // Sort by timestamp
      recentActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(recentActivities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-md p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Your Activity</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Share2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.shares}</p>
          <p className="text-xs text-gray-600">Shares</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.reviews}</p>
          <p className="text-xs text-gray-600">Reviews</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.favorites}</p>
          <p className="text-xs text-gray-600">Favorites</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.friends}</p>
          <p className="text-xs text-gray-600">Friends</p>
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h4>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserActivityCard;
```

---

## Phase 3: Polish & Testing (Days 9-10)

### Day 9: Loading & Empty States

#### 6.1 Create Loading Skeleton Components

**File:** `src/components/ui/LoadingSkeleton.tsx`

```typescript
// src/components/ui/LoadingSkeleton.tsx
import React from 'react';

export const BusinessCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
    <div className="h-32 bg-gray-200" />
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Welcome Banner Skeleton */}
    <div className="h-32 bg-gray-200 rounded-3xl animate-pulse" />

    {/* Section Skeleton */}
    {[1, 2, 3].map(section => (
      <div key={section} className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(card => (
            <BusinessCardSkeleton key={card} />
          ))}
        </div>
      </div>
    ))}
  </div>
);
```

#### 6.2 Add Empty States to Dashboard

**File:** `src/components/dashboard/EmptyState.tsx`

```typescript
// src/components/dashboard/EmptyState.tsx
import React from 'react';
import { Store, Search, MapPin } from 'lucide-react';

interface EmptyStateProps {
  type: 'spotlight' | 'offers' | 'products' | 'new_businesses';
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction }) => {
  const content = {
    spotlight: {
      icon: <Store className="w-16 h-16 text-gray-300" />,
      title: 'No businesses yet',
      description: 'Check back soon for featured businesses in your area',
      actionText: 'Explore nearby',
    },
    offers: {
      icon: <Search className="w-16 h-16 text-gray-300" />,
      title: 'No hot offers',
      description: 'We\'ll notify you when new deals become available',
      actionText: 'View all coupons',
    },
    products: {
      icon: <Store className="w-16 h-16 text-gray-300" />,
      title: 'No trending products',
      description: 'Be the first to discover great products',
      actionText: 'Browse businesses',
    },
    new_businesses: {
      icon: <MapPin className="w-16 h-16 text-gray-300" />,
      title: 'No new businesses',
      description: 'No businesses have opened recently in your city',
      actionText: 'View all businesses',
    },
  };

  const { icon, title, description, actionText } = content[type];

  return (
    <div className="text-center py-12 bg-white rounded-2xl">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
```

---

### Day 10: Testing & Validation

#### 7.1 Create Test Checklist Document

**File:** `EPIC_3_TESTING_CHECKLIST.md`

```markdown
# Epic 3 Testing Checklist

## Ad Slots Carousel
- [ ] Displays up to 6 ad slots
- [ ] Empty slots filled with organic content
- [ ] Organic content labeled "Recommended"
- [ ] Paid ads labeled "Sponsored"
- [ ] Carousel auto-advances every 5 seconds
- [ ] Manual navigation works (prev/next buttons)
- [ ] Indicators show current position
- [ ] Clicks tracked for paid ads
- [ ] Impressions tracked for paid ads
- [ ] Responsive on mobile devices

## City Picker
- [ ] Modal opens when clicking city button
- [ ] Cities list loads from database
- [ ] Cities grouped by tier (1, 2, 3)
- [ ] Search filter works correctly
- [ ] Tier filter works correctly
- [ ] City selection updates profile
- [ ] Current city highlighted
- [ ] Context propagates to dashboard
- [ ] Dashboard content updates for new city
- [ ] Loading state shown while fetching

## Notification Deep-linking
- [ ] Notification hub displays all notifications
- [ ] Unread notifications highlighted
- [ ] Click routes to storefront correctly
- [ ] Click routes to product correctly
- [ ] Click routes to wallet correctly
- [ ] Click routes to feed correctly
- [ ] Click routes to profile correctly
- [ ] Notification marked as read on click
- [ ] "Mark all as read" button works
- [ ] Real-time notifications appear instantly
- [ ] Notification count badge updates

## Dashboard Sections
- [ ] Spotlight Businesses shows ≥5 items (or empty state)
- [ ] Hot Offers shows ≥5 items (or empty state)
- [ ] Trending Products shows ≥5 items (or empty state)
- [ ] New Businesses shows ≥5 items (or empty state)
- [ ] All sections load from real API
- [ ] Loading skeletons display while fetching
- [ ] Empty states show appropriate messages
- [ ] Error states handled gracefully
- [ ] Refresh works correctly
- [ ] Content updates when city changes

## User Activity Card
- [ ] Displays correct share count
- [ ] Displays correct review count
- [ ] Displays correct favorites count
- [ ] Displays correct friends count
- [ ] Recent activities list populated
- [ ] Activities sorted by timestamp
- [ ] Real-time updates work

## Performance
- [ ] Dashboard loads in <2 seconds
- [ ] Smooth animations throughout
- [ ] No layout shift during loading
- [ ] Images lazy-loaded
- [ ] API calls batched/optimized

## Mobile Responsiveness
- [ ] All sections responsive
- [ ] Touch targets appropriately sized
- [ ] Swipe gestures work
- [ ] Safe area insets respected
- [ ] No horizontal scroll

## Accessibility
- [ ] All interactive elements keyboard navigable
- [ ] Screen reader announcements correct
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on images
```

---

## File Structure

```
src/
├── components/
│   ├── ads/
│   │   ├── AdSlot.tsx                    ✅ NEW
│   │   └── AdCarousel.tsx                ✅ NEW
│   ├── dashboard/
│   │   ├── UserActivityCard.tsx          ✅ NEW
│   │   └── EmptyState.tsx                ✅ NEW
│   ├── location/
│   │   └── CityPicker.tsx                ✅ NEW
│   ├── ui/
│   │   └── LoadingSkeleton.tsx           ✅ NEW
│   ├── Dashboard.tsx                     🔄 UPDATE
│   ├── Layout.tsx                        🔄 UPDATE
│   └── NotificationHub.tsx               🔄 REWRITE
├── hooks/
│   ├── useAdSlots.ts                     ✅ NEW
│   └── useCities.ts                      ✅ NEW
├── services/
│   ├── dashboardService.ts               ✅ NEW
│   └── notificationService.ts            ✅ NEW
├── types/
│   ├── ads.ts                            ✅ NEW
│   ├── location.ts                       ✅ NEW
│   └── notifications.ts                  ✅ NEW
└── utils/
    └── notificationRouter.ts             ✅ NEW
```

---

## Database Migrations Required

### Migration 1: Ads Table

```sql
-- Create ads table
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banner', 'carousel', 'search', 'trending')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  daily_budget DECIMAL(10, 2) DEFAULT 500.00,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ad tracking functions
CREATE OR REPLACE FUNCTION track_ad_impression(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET impressions = impressions + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_ad_click(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active ads" ON ads
  FOR SELECT USING (status = 'active');

CREATE POLICY "Business owners can manage their ads" ON ads
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM businesses WHERE id = ads.business_id
  ));
```

### Migration 2: Notifications Table

```sql
-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('storefront', 'product', 'wallet', 'feed', 'profile', 'coupon')),
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Deploy updated components to production
- [ ] Verify environment variables
- [ ] Test in staging environment
- [ ] Monitor error logs
- [ ] Verify ad impression/click tracking
- [ ] Test notification real-time subscriptions
- [ ] Verify city context propagation
- [ ] Load test dashboard with real data
- [ ] Verify mobile responsiveness

---

## Success Metrics

After deployment, monitor:

1. **Ad Slots:**
   - Impression rate
   - Click-through rate (CTR)
   - Revenue generated (₹500/day * active ads)

2. **City Picker:**
   - Usage frequency
   - City change conversions
   - Dashboard re-load performance

3. **Notifications:**
   - Delivery rate
   - Click-through rate
   - Time to action

4. **Dashboard:**
   - Load time (<2s target)
   - Engagement with sections
   - API error rates

---

## Estimated Timeline Summary

| Phase | Days | Tasks |
|-------|------|-------|
| **Week 1** | 5 | Ad Slots, City Picker, Notification Routing |
| **Week 2** | 3 | API Integration, New Section, User Activity |
| **Week 2-3** | 2 | Loading States, Testing, Polish |
| **Total** | **10 days** | **Full Compliance Achieved** |

---

## Contact & Support

For questions or issues during implementation:
- Refer to Enhanced Project Brief v2.0
- Check Mermaid Chart v2 for flow diagrams
- Review EPIC_3_NAVIGATION_UI_AUDIT_REPORT.md for context

**Good luck with the implementation! 🚀**
