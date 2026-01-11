# Story 4C.5: Enhanced Steps 2-4 with Pre-fill

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🟠 P1 - HIGH  
**Effort:** 2 days  
**Dependencies:** Story 4C.3 (Smart Search)  
**Status:** 📋 Ready for Implementation

---

## Overview

Update the existing registration steps (Basic Details, Location, Hours/Media) to support pre-filled data from Google Places API. Add live preview card, quick hours templates, and map visualization.

---

## User Stories

### US-4C.5.1: Pre-fill Support
**As a** business owner  
**I want to** see my details auto-filled from Google  
**So that** I don't have to re-enter information

**Acceptance Criteria:**
- [ ] Pre-filled fields are visually marked
- [ ] All pre-filled fields are editable
- [ ] Editing clears the "pre-filled" indicator
- [ ] Empty fields marked as "needs input"

---

### US-4C.5.2: Live Preview Card
**As a** business owner  
**I want to** see a preview of my business card  
**So that** I know how it will look to customers

**Acceptance Criteria:**
- [ ] Preview card updates in real-time
- [ ] Shows logo, name, category, rating placeholder
- [ ] Visible on desktop (side panel)
- [ ] Collapsible on mobile

---

### US-4C.5.3: Quick Hours Templates
**As a** business owner  
**I want to** select a common schedule template  
**So that** I don't have to set each day manually

**Acceptance Criteria:**
- [ ] Templates: Standard, Always Open, Restaurant, Custom
- [ ] Selecting template pre-fills all days
- [ ] Can still edit individual days after
- [ ] Template selector at top of hours section

---

### US-4C.5.4: Map Location Preview
**As a** business owner  
**I want to** see my business location on a map  
**So that** I can verify it's correct

**Acceptance Criteria:**
- [ ] Map shows pin at business coordinates
- [ ] Pin can be dragged to adjust location
- [ ] Coordinates update when pin is moved
- [ ] Map is optional (uses static image if no API key)

---

## Component Implementations

### BusinessPreviewCard Component
**File:** `src/components/business/onboarding/components/BusinessPreviewCard.tsx`

```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Phone, Globe, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessPreviewCardProps {
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  coverUrl?: string;
  isVerified?: boolean;
  className?: string;
}

export function BusinessPreviewCard({
  name,
  category,
  address,
  city,
  state,
  phone,
  website,
  logoUrl,
  coverUrl,
  isVerified = false,
  className
}: BusinessPreviewCardProps) {
  const fullLocation = [address, city, state].filter(Boolean).join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden",
        className
      )}
    >
      {/* Cover Image */}
      <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image className="w-8 h-8 text-white/50" />
          </div>
        )}
        
        {/* Logo */}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-xl bg-white shadow-md border-2 border-white overflow-hidden">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">
                  {name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-10 p-4">
        {/* Name & Verification */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              {name || 'Your Business Name'}
            </h3>
            {category && (
              <p className="text-sm text-indigo-600 font-medium">
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            )}
          </div>
          {isVerified && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Rating Placeholder */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map(star => (
            <Star 
              key={star} 
              className="w-4 h-4 text-gray-300" 
              fill="currentColor"
            />
          ))}
          <span className="text-sm text-gray-500 ml-1">No reviews yet</span>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-600">
          {fullLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{fullLocation}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>+91 {phone}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate text-indigo-600">{website}</span>
            </div>
          )}
        </div>

        {/* Preview Label */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Live Preview
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default BusinessPreviewCard;
```

---

### QuickHoursTemplate Component
**File:** `src/components/business/onboarding/components/QuickHoursTemplate.tsx`

```typescript
import React from 'react';
import { Clock, Building2, Utensils, Sun, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperatingHours {
  open: string;
  close: string;
  closed: boolean;
}

interface QuickHoursTemplateProps {
  onSelectTemplate: (hours: Record<string, OperatingHours>) => void;
  selectedTemplate: string | null;
}

const templates = [
  {
    id: 'standard',
    name: 'Standard Business',
    description: 'Mon-Fri 9-6, Sat 10-4, Sun Closed',
    icon: Building2,
    hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true }
    }
  },
  {
    id: 'always_open',
    name: 'Always Open',
    description: '24 hours, 7 days a week',
    icon: Sun,
    hours: {
      monday: { open: '00:00', close: '23:59', closed: false },
      tuesday: { open: '00:00', close: '23:59', closed: false },
      wednesday: { open: '00:00', close: '23:59', closed: false },
      thursday: { open: '00:00', close: '23:59', closed: false },
      friday: { open: '00:00', close: '23:59', closed: false },
      saturday: { open: '00:00', close: '23:59', closed: false },
      sunday: { open: '00:00', close: '23:59', closed: false }
    }
  },
  {
    id: 'restaurant',
    name: 'Restaurant Hours',
    description: '11am-10pm daily',
    icon: Utensils,
    hours: {
      monday: { open: '11:00', close: '22:00', closed: false },
      tuesday: { open: '11:00', close: '22:00', closed: false },
      wednesday: { open: '11:00', close: '22:00', closed: false },
      thursday: { open: '11:00', close: '22:00', closed: false },
      friday: { open: '11:00', close: '23:00', closed: false },
      saturday: { open: '11:00', close: '23:00', closed: false },
      sunday: { open: '11:00', close: '22:00', closed: false }
    }
  },
  {
    id: 'retail',
    name: 'Retail Hours',
    description: '10am-9pm daily',
    icon: Clock,
    hours: {
      monday: { open: '10:00', close: '21:00', closed: false },
      tuesday: { open: '10:00', close: '21:00', closed: false },
      wednesday: { open: '10:00', close: '21:00', closed: false },
      thursday: { open: '10:00', close: '21:00', closed: false },
      friday: { open: '10:00', close: '21:00', closed: false },
      saturday: { open: '10:00', close: '21:00', closed: false },
      sunday: { open: '11:00', close: '20:00', closed: false }
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Set your own hours',
    icon: Settings,
    hours: null // No pre-fill
  }
];

export function QuickHoursTemplate({
  onSelectTemplate,
  selectedTemplate
}: QuickHoursTemplateProps) {
  const handleSelectTemplate = (template: typeof templates[0]) => {
    if (template.hours) {
      onSelectTemplate(template.hours);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Quick Select Schedule
      </label>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {templates.map(template => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;
          
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mb-1",
                isSelected ? "text-indigo-600" : "text-gray-400"
              )} />
              <p className={cn(
                "font-medium text-sm",
                isSelected ? "text-indigo-900" : "text-gray-900"
              )}>
                {template.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickHoursTemplate;
```

---

### PrefilledFieldIndicator Component
**File:** `src/components/business/onboarding/components/PrefilledFieldIndicator.tsx`

```typescript
import React from 'react';
import { Sparkles, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrefilledFieldIndicatorProps {
  isPrefilled: boolean;
  onEdit?: () => void;
  className?: string;
}

export function PrefilledFieldIndicator({
  isPrefilled,
  onEdit,
  className
}: PrefilledFieldIndicatorProps) {
  if (!isPrefilled) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full",
      className
    )}>
      <Sparkles className="w-3 h-3" />
      <span>Auto-filled</span>
      {onEdit && (
        <button 
          type="button"
          onClick={onEdit}
          className="ml-1 hover:text-blue-900"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Hook to track pre-filled fields
export function usePrefilledFields(initialPrefilled: string[] = []) {
  const [prefilledFields, setPrefilledFields] = React.useState<Set<string>>(
    new Set(initialPrefilled)
  );

  const markAsEdited = (field: string) => {
    setPrefilledFields(prev => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const isPrefilled = (field: string) => prefilledFields.has(field);

  return { isPrefilled, markAsEdited };
}

export default PrefilledFieldIndicator;
```

---

### Updated Step2_BasicDetails
**File:** `src/components/business/onboarding/steps/Step2_BasicDetails.tsx`

```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { PrefilledFieldIndicator, usePrefilledFields } from '../components/PrefilledFieldIndicator';
import { BusinessPreviewCard } from '../components/BusinessPreviewCard';
import { cn } from '@/lib/utils';

interface Step2_BasicDetailsProps {
  formData: {
    businessName: string;
    businessType: string;
    category: string;
    description: string;
    businessEmail: string;
    businessPhone: string;
  };
  onFieldChange: (field: string, value: string) => void;
  prefilledFields: string[];
  categories: Array<{ id: string; name: string; display_name: string }>;
  errors: Record<string, string>;
}

export function Step2_BasicDetails({
  formData,
  onFieldChange,
  prefilledFields,
  categories,
  errors
}: Step2_BasicDetailsProps) {
  const { isPrefilled, markAsEdited } = usePrefilledFields(prefilledFields);

  const handleChange = (field: string, value: string) => {
    onFieldChange(field, value);
    markAsEdited(field);
  };

  return (
    <div className="flex gap-8">
      {/* Main Form */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Basic Details</h2>
          </div>
          <p className="text-gray-600">
            Tell customers about your business
          </p>
        </motion.div>

        {/* Business Name */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Business Name *
            </label>
            <PrefilledFieldIndicator isPrefilled={isPrefilled('businessName')} />
          </div>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className={cn(
              "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500",
              isPrefilled('businessName') && "border-blue-300 bg-blue-50",
              errors.businessName && "border-red-500"
            )}
            placeholder="Enter your business name"
          />
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
          )}
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <select
            value={formData.businessType}
            onChange={(e) => handleChange('businessType', e.target.value)}
            className={cn(
              "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500",
              errors.businessType && "border-red-500"
            )}
          >
            <option value="">Select business type</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
            <option value="Partnership">Partnership</option>
            <option value="Private Limited">Private Limited (Pvt Ltd)</option>
            <option value="LLP">Limited Liability Partnership (LLP)</option>
            <option value="Public Limited">Public Limited</option>
          </select>
          {errors.businessType && (
            <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Category *
            </label>
            <PrefilledFieldIndicator isPrefilled={isPrefilled('category')} />
          </div>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className={cn(
              "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500",
              isPrefilled('category') && "border-blue-300 bg-blue-50",
              errors.category && "border-red-500"
            )}
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>
                {cat.display_name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            maxLength={500}
            className={cn(
              "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none",
              errors.description && "border-red-500"
            )}
            placeholder="Describe your business, products, and services..."
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p className="text-sm text-red-600">{errors.description}</p>
            ) : (
              <span />
            )}
            <span className="text-sm text-gray-400">
              {formData.description.length}/500
            </span>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            <input
              type="email"
              value={formData.businessEmail}
              onChange={(e) => handleChange('businessEmail', e.target.value)}
              className={cn(
                "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500",
                errors.businessEmail && "border-red-500"
              )}
              placeholder="contact@business.com"
            />
            {errors.businessEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.businessEmail}</p>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Business Phone
              </label>
              <PrefilledFieldIndicator isPrefilled={isPrefilled('businessPhone')} />
            </div>
            <input
              type="tel"
              value={formData.businessPhone}
              onChange={(e) => handleChange('businessPhone', e.target.value)}
              className={cn(
                "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500",
                isPrefilled('businessPhone') && "border-blue-300 bg-blue-50"
              )}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>

      {/* Desktop Preview Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-4">
          <BusinessPreviewCard
            name={formData.businessName}
            category={formData.category}
            phone={formData.businessPhone}
          />
        </div>
      </div>
    </div>
  );
}

export default Step2_BasicDetails;
```

---

## Acceptance Criteria

### Pre-fill
- [ ] Fields with Google data show "Auto-filled" badge
- [ ] Editing a field removes the badge
- [ ] Empty required fields show red border
- [ ] All fields remain editable

### Live Preview
- [ ] Preview card visible on desktop (lg:+)
- [ ] Updates in real-time as user types
- [ ] Shows placeholder for empty logo
- [ ] Displays category with proper formatting

### Quick Hours
- [ ] 5 templates available (Standard, Always Open, Restaurant, Retail, Custom)
- [ ] Selecting template fills all days
- [ ] Individual days still editable after template selection
- [ ] "Custom" option just clears selection

### Map (Step 3)
- [ ] Shows pin at coordinates
- [ ] Draggable pin updates coordinates
- [ ] Falls back to static map if no Maps API key
- [ ] "Get Location" button uses device GPS

---

## Additional Components Required

### ProgressStepper Component
**File:** `src/components/business/onboarding/components/ProgressStepper.tsx`

```typescript
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  name: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressStepper({ steps, currentStep, className }: ProgressStepperProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-indigo-600 text-white",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className={cn(
                "mt-2 text-xs font-medium hidden md:block",
                isCurrent ? "text-indigo-600" : "text-gray-500"
              )}>
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2",
                isCompleted ? "bg-green-500" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

---

### useBusinessOnboarding Hook
**File:** `src/hooks/useBusinessOnboarding.ts`

```typescript
import { useState, useCallback } from 'react';

interface BusinessFormData {
  businessName: string;
  businessType: string;
  category: string;
  description: string;
  businessEmail: string;
  businessPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  website: string;
  googlePlaceId: string | null;
  phoneVerified: boolean;
  operatingHours: Record<string, { open: string; close: string; closed: boolean }>;
  logoFile: File | null;
  coverFile: File | null;
}

const initialFormData: BusinessFormData = {
  businessName: '',
  businessType: '',
  category: '',
  description: '',
  businessEmail: '',
  businessPhone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  latitude: null,
  longitude: null,
  website: '',
  googlePlaceId: null,
  phoneVerified: false,
  operatingHours: {},
  logoFile: null,
  coverFile: null,
};

export function useBusinessOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof BusinessFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const prefillFromGoogle = useCallback((data: Partial<BusinessFormData>) => {
    const fieldsToSet = Object.keys(data).filter(k => data[k as keyof typeof data]);
    setPrefilledFields(new Set(fieldsToSet));
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, 4)));
  }, []);

  return {
    currentStep,
    formData,
    prefilledFields: Array.from(prefilledFields),
    isSubmitting,
    updateField,
    prefillFromGoogle,
    nextStep,
    prevStep,
    goToStep,
    setIsSubmitting,
  };
}
```

---

## Definition of Done

- [ ] BusinessPreviewCard component implemented
- [ ] QuickHoursTemplate component implemented
- [ ] PrefilledFieldIndicator component implemented
- [ ] **ProgressStepper component implemented** ✨ NEW
- [ ] **useBusinessOnboarding hook implemented** ✨ NEW
- [ ] Step 2 updated with pre-fill support
- [ ] Step 3 updated with map preview
- [ ] Step 4 updated with quick hours
- [ ] Live preview working on desktop
- [ ] Mobile responsive
- [ ] All acceptance criteria met

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 20 hours (increased to account for additional components)
