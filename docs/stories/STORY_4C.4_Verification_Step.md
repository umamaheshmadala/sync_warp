# Story 4C.4: Phone Verification Step (Step 1)

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** Story 4C.2 (Phone OTP System), Story 4C.3 (Smart Search)  
**Status:** 📋 Ready for Implementation

---

## Overview

Create a dedicated verification step in the onboarding wizard. After finding/selecting their business in Step 0, users must verify they own the business phone number before proceeding. This prevents fraudulent listings and builds trust.

---

## User Stories

### US-4C.4.1: Display Phone for Verification
**As a** business owner  
**I want to** see the phone number that will be verified  
**So that** I can confirm it's correct before receiving the OTP

**Acceptance Criteria:**
- [ ] Phone number displayed prominently
- [ ] If pre-filled from Google, show source indicator
- [ ] "Edit" option to correct phone number
- [ ] Phone format validated before proceeding

---

### US-4C.4.2: OTP Verification Flow
**As a** business owner  
**I want to** verify my business phone via OTP  
**So that** I can prove ownership

**Acceptance Criteria:**
- [ ] Integrates BusinessPhoneVerification component
- [ ] Success state allows proceeding to Step 2
- [ ] Error states handled gracefully
- [ ] Progress saved even if user leaves

---

### US-4C.4.3: Skip Verification Option
**As a** business owner  
**I want to** skip verification if I can't receive the OTP now  
**So that** I can still register and verify later

**Acceptance Criteria:**
- [ ] "Skip for now" option clearly visible
- [ ] Warning explains limited features
- [ ] Business marked as "unverified" in database
- [ ] Reminder shown later to complete verification

---

## Component Implementation

**File:** `src/components/business/onboarding/steps/Step1_PhoneVerify.tsx`

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';
import { BusinessPhoneVerification } from '../components/BusinessPhoneVerification';
import { cn } from '@/lib/utils';

interface Step1_PhoneVerifyProps {
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  onVerified: () => void;
  onSkip: () => void;
  businessName: string;
  isPrefilledFromGoogle: boolean;
}

export function Step1_PhoneVerify({
  phoneNumber,
  onPhoneChange,
  onVerified,
  onSkip,
  businessName,
  isPrefilledFromGoogle
}: Step1_PhoneVerifyProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const handleVerified = () => {
    setIsVerified(true);
    // Small delay for animation
    setTimeout(() => {
      onVerified();
    }, 1500);
  };

  const handleSkipClick = () => {
    setShowSkipWarning(true);
  };

  const confirmSkip = () => {
    onSkip();
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verify you own this business
        </h1>
        <p className="text-gray-600">
          We'll send a verification code to confirm you own <strong>{businessName}</strong>
        </p>
      </motion.div>

      {/* Pre-fill Indicator */}
      {isPrefilledFromGoogle && phoneNumber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800">
              We found this phone number from Google for your business. Please verify it's correct.
            </p>
          </div>
        </motion.div>
      )}

      {/* Phone Verification Component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <BusinessPhoneVerification
          phoneNumber={phoneNumber}
          onPhoneChange={onPhoneChange}
          onVerified={handleVerified}
          isVerified={isVerified}
        />
      </motion.div>

      {/* Success State */}
      <AnimatePresence>
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Verification Complete!
            </h3>
            <p className="text-green-600">
              Proceeding to next step...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Warning Modal */}
      <AnimatePresence>
        {showSkipWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSkipWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-amber-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Skip Verification?
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Unverified businesses have limited features:
              </p>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                  No "Verified" badge on your profile
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                  Cannot be featured in promotions
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                  Requires admin approval for changes
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-500 flex items-center justify-center text-xs">✓</span>
                  Can verify later anytime
                </li>
              </ul>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkipWarning(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmSkip}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
                >
                  Skip Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Link */}
      {!isVerified && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <button
            onClick={handleSkipClick}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip verification for now →
          </button>
        </motion.div>
      )}

      {/* Why Verify Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 bg-gray-50 rounded-xl p-4"
      >
        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          Why verify your business?
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Builds trust with potential customers</li>
          <li>• Prevents unauthorized changes to your listing</li>
          <li>• Unlocks premium features and promotions</li>
          <li>• Verified badge displayed on your profile</li>
        </ul>
      </motion.div>
    </div>
  );
}

export default Step1_PhoneVerify;
```

---

## UI/UX Flow

### Initial State
```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│                    🛡️                                         │
│           Verify you own this business                       │
│                                                               │
│   We'll send a verification code to confirm you own          │
│   "Mumbai Coffee House"                                       │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 💬 We found this phone from Google for your        │   │
│   │    business. Please verify it's correct.           │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                               │
│   Business Phone Number *                                    │
│   ┌────────┬──────────────────────┬─────────────┐          │
│   │  +91   │  98765 43210         │  Send OTP   │          │
│   └────────┴──────────────────────┴─────────────┘          │
│                                                               │
│                Skip verification for now →                   │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 🛡️ Why verify your business?                        │   │
│   │ • Builds trust with potential customers             │   │
│   │ • Prevents unauthorized changes                     │   │
│   │ • Unlocks premium features                          │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Skip Warning Modal
```
┌────────────────────────────────────────────────────┐
│                                                     │
│                    ⚠️                               │
│            Skip Verification?                       │
│                                                     │
│   Unverified businesses have limited features:     │
│                                                     │
│   ✕ No "Verified" badge on your profile           │
│   ✕ Cannot be featured in promotions              │
│   ✕ Requires admin approval for changes           │
│   ✓ Can verify later anytime                      │
│                                                     │
│   ┌──────────────┐  ┌──────────────┐              │
│   │   Go Back    │  │ Skip Anyway  │              │
│   └──────────────┘  └──────────────┘              │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## State Management

### Wizard State Updates
```typescript
interface OnboardingWizardState {
  currentStep: number;
  businessData: {
    name: string;
    phone: string;
    phoneVerified: boolean;
    verifiedAt: Date | null;
    googlePlaceId: string | null;
    // ... other fields
  };
  isPrefilledFromGoogle: boolean;
}

// After verification
const handlePhoneVerified = () => {
  setWizardState(prev => ({
    ...prev,
    businessData: {
      ...prev.businessData,
      phoneVerified: true,
      verifiedAt: new Date()
    },
    currentStep: 2 // Move to Step 2: Basic Details
  }));
};

// After skip
const handleSkipVerification = () => {
  setWizardState(prev => ({
    ...prev,
    businessData: {
      ...prev.businessData,
      phoneVerified: false,
      verifiedAt: null
    },
    currentStep: 2 // Still proceed to Step 2
  }));
};
```

---

## Acceptance Criteria

### Verification Flow
- [ ] Phone number displayed from Step 0 selection
- [ ] Can edit phone number before sending OTP
- [ ] OTP flow integrates with BusinessPhoneVerification
- [ ] Success animation plays after verification
- [ ] Auto-proceeds to Step 2 after success

### Skip Flow
- [ ] "Skip for now" link visible below verification
- [ ] Clicking shows warning modal
- [ ] Modal explains consequences clearly
- [ ] "Go Back" returns to verification
- [ ] "Skip Anyway" proceeds to Step 2

### Data Persistence
- [ ] Phone number saved to wizard state
- [ ] Verification status saved to wizard state
- [ ] If user leaves, progress is preserved (session storage)
- [ ] On submit, `phone_verified` flag set in database

### Mobile Responsiveness
- [ ] Full-width layout on mobile
- [ ] Modal is scrollable if needed
- [ ] Touch-friendly buttons
- [ ] No overflow issues

---

## Definition of Done

- [ ] Component implemented as specified
- [ ] Integrates with BusinessPhoneVerification
- [ ] Skip warning modal working
- [ ] State management integrated
- [ ] Mobile responsive
- [ ] Animations smooth
- [ ] Unit tests passing
- [ ] Integrated into wizard flow

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 16 hours
