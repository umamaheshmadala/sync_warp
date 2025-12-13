# 🚀 Sync App - New Laptop Setup Guide

**Last Updated:** December 2024  
**Project:** sync_warp (Sync Messaging App)

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone Repository](#2-clone-repository)
3. [Install Dependencies](#3-install-dependencies)
4. [Environment Configuration](#4-environment-configuration)
5. [IDE Setup](#5-ide-setup)
6. [Run Development Server](#6-run-development-server)
7. [Mobile Development Setup](#7-mobile-development-setup)
8. [Database Access](#8-database-access)
9. [Testing Setup](#9-testing-setup)
10. [Deployment](#10-deployment)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | v18+ (LTS recommended) | https://nodejs.org/ |
| **Git** | Latest | https://git-scm.com/ |
| **VS Code** | Latest | https://code.visualstudio.com/ |
| **Android Studio** | Latest (for Android dev) | https://developer.android.com/studio |
| **Xcode** | 14+ (macOS only, for iOS dev) | App Store |

### Install Node.js (Windows)
```powershell
# Using winget (Windows Package Manager)
winget install OpenJS.NodeJS.LTS

# Verify installation
node --version  # Should show v18+
npm --version   # Should show 9+
```

### Install Git (Windows)
```powershell
winget install Git.Git

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 2. Clone Repository

### Option A: HTTPS (Recommended)
```powershell
cd C:\Users\<YourUsername>\Documents\GitHub
git clone https://github.com/umamaheshmadala/sync_warp.git
cd sync_warp
```

### Option B: SSH
```powershell
# First, set up SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
cd C:\Users\<YourUsername>\Documents\GitHub
git clone git@github.com:umamaheshmadala/sync_warp.git
cd sync_warp
```

### Switch to Development Branch
```powershell
git checkout mostly_antigravity_build
git pull origin mostly_antigravity_build
```

---

## 3. Install Dependencies

```powershell
# Install all Node.js dependencies
npm install

# This installs:
# - React 18 + Vite
# - TanStack Query
# - Zustand (state management)
# - Supabase JS client
# - Capacitor (mobile framework)
# - Tailwind CSS + Shadcn UI
# - Vitest + Playwright (testing)
```

### Verify Installation
```powershell
npm run type-check  # TypeScript check
npm run lint        # ESLint check
```

---

## 4. Environment Configuration

### Step 1: Copy Environment Files

The project uses multiple environment configurations. You need to set up:

```powershell
# Copy example to create your local environment files
copy .env.example .env
copy .env.example .env.development
copy .env.example .env.local
```

### Step 2: Get Supabase Credentials

Your Supabase project: `ysxmgbblljoyebvugrfo`

| Variable | Value | How to Get |
|----------|-------|------------|
| `VITE_SUPABASE_URL` | `https://ysxmgbblljoyebvugrfo.supabase.co` | Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | (see .env.example) | Dashboard → Settings → API → anon public |

### Step 3: Edit `.env` and `.env.development`

```env
# Core Supabase Config (already in .env.example)
VITE_SUPABASE_URL=https://ysxmgbblljoyebvugrfo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI

# Optional: Google Maps (for location features)
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

### Step 4: Integration Test Environment (Optional)

If you need to run integration tests, create:

```powershell
# Create integration test env file
echo "SUPABASE_URL=https://ysxmgbblljoyebvugrfo.supabase.co" > .env.integration
echo "SUPABASE_ANON_KEY=<your_anon_key>" >> .env.integration
echo "SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>" >> .env.integration
```

> ⚠️ **IMPORTANT:** Never commit `.env` files with real credentials! They're in `.gitignore`.

---

## ⚠️ Manual File Transfer Required

**These files are NOT in GitHub (for security) and MUST be copied manually:**

1. **`android/app/google-services.json`**
   - **Why?** Required for Push Notifications (Firebase).
   - **How?** Copy from old laptop `sync_warp/android/app/google-services.json` to the same folder here.

2. **`.maestro/` (Optional)**
   - Maestro flows are in the repo, but if you had any local credentials in `.maestro/config.yaml`, check them.

---

## 5. IDE Setup

### VS Code Extensions (Recommended)

Install these extensions for the best development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-playwright.playwright",
    "denoland.vscode-deno"
  ]
}
```

### VS Code Settings

Create/update `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

---

## 6. Run Development Server

### Web Development
```powershell
# Start Vite dev server
npm run dev

# Opens at: http://localhost:5173
```

### Run Tests
```powershell
# Unit tests
npm test

# Unit tests with UI
npm run test:ui

# Coverage report
npm run test:coverage

# Integration tests (requires env setup)
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## 7. Mobile Development Setup

### Android Setup

#### Step 1: Install Android Studio
- Download from: https://developer.android.com/studio
- During installation, select:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device (AVD)

#### Step 2: Configure Android SDK
```powershell
# Add to your PATH (System Environment Variables):
# C:\Users\<YourUsername>\AppData\Local\Android\Sdk\platform-tools
# C:\Users\<YourUsername>\AppData\Local\Android\Sdk\tools

# Set ANDROID_HOME environment variable:
# C:\Users\<YourUsername>\AppData\Local\Android\Sdk
```

#### Step 3: Connect Physical Device
1. Enable Developer Options on your phone (tap Build Number 7 times)
2. Enable USB Debugging
3. Connect via USB
4. Run:
```powershell
adb devices  # Should show your device
```

#### Step 4: Build & Run Android App
```powershell
# Build web assets and sync to Android
npm run build
npx cap sync

# Run on connected device
npx cap run android --target <DEVICE_ID>

# Or open in Android Studio
npx cap open android
```

### iOS Setup (macOS Only)

#### Step 1: Install Xcode
- Install from App Store
- Open Xcode and install command line tools

#### Step 2: Install CocoaPods
```bash
sudo gem install cocoapods
```

#### Step 3: Build & Run iOS App
```bash
npm run build
npx cap sync

# Open in Xcode
npx cap open ios

# Or run directly (requires device/simulator)
npx cap run ios
```

---

## 8. Database Access

### Supabase Dashboard
- **URL:** https://app.supabase.com/project/ysxmgbblljoyebvugrfo
- **Database:** PostgreSQL
- **Auth:** Supabase Auth with email/password

### Key Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `friendships` | Friend connections |
| `conversations` | Chat conversations |
| `messages` | Chat messages |
| `notifications` | User notifications |
| `blocked_users` | Block relationships |

### Migrations
Migrations are in `supabase/migrations/`. Key files:
- `20250206_create_cleanup_functions.sql` - Cleanup functions
- `20250118_friend_requests.sql` - Friends system
- `20250106_create_notifications_table.sql` - Notifications

### Edge Functions
Located in `supabase/functions/`:
- `cleanup-old-messages` - Message retention cleanup
- `cleanup-messaging` - Orphaned data cleanup
- `send-push-notification` - Push notifications

---

## 9. Testing Setup

### Unit Tests (Vitest)
```powershell
npm test              # Run once
npm run test:ui       # Interactive UI
npm run test:coverage # With coverage
```

### Integration Tests
```powershell
# Requires SUPABASE_SERVICE_ROLE_KEY in .env
npm run test:integration
```

### E2E Tests (Playwright)
```powershell
# Install browsers first
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Maestro Mobile Tests
```powershell
# Install Maestro (one-time)
curl -Ls https://get.maestro.mobile.dev | bash

# Run mobile flows
maestro test .maestro/flows/login.yaml
maestro test .maestro/flows/send-message.yaml
```

---

## 10. Deployment

### Netlify (Web)
```powershell
# Build for production
npm run build

# Deploy (if Netlify CLI installed)
netlify deploy --prod
```

### Mobile App Stores
```powershell
# Production build for Android
npm run build:prod
npx cap sync
npx cap open android
# Then build signed APK/AAB in Android Studio

# Production build for iOS
npm run build:prod
npx cap sync
npx cap open ios
# Then archive and upload in Xcode
```

---

## 11. Troubleshooting

### Common Issues

#### "Module not found" errors
```powershell
rm -rf node_modules
rm package-lock.json
npm install
```

#### TypeScript errors
```powershell
npm run type-check
# Fix any reported issues
```

#### Android build fails
```powershell
cd android
./gradlew clean
cd ..
npx cap sync
```

#### Supabase connection issues
1. Check your `.env` files have correct credentials
2. Verify RLS policies allow access
3. Check network connectivity

#### Playwright tests fail
```powershell
# Reinstall browsers
npx playwright install --force

# Run with debug
npm run test:e2e:debug
```

---

## 📁 Project Structure

```
sync_warp/
├── android/              # Android native project
├── docs/                 # Documentation
│   ├── epics/           # Epic specifications
│   ├── stories/         # User stories
│   ├── checklists/      # Testing checklists
│   └── audit_reports/   # Audit reports
├── src/                  # Source code
│   ├── components/      # React components
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Zustand stores
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── supabase/             # Supabase config
│   ├── functions/       # Edge Functions
│   └── migrations/      # Database migrations
├── tests/                # Test files
│   ├── e2e/             # E2E tests
│   └── integration/     # Integration tests
└── .maestro/             # Maestro mobile tests
```

---

## 🔑 Key Credentials (Keep Secure!)

These are the credentials you need. Store them securely!

| Item | Where to Get |
|------|--------------|
| Supabase URL | Dashboard → Settings → API |
| Supabase Anon Key | Dashboard → Settings → API |
| Supabase Service Role Key | Dashboard → Settings → API (for admin ops) |
| Google Maps API Key | Google Cloud Console |
| Netlify Access Token | Netlify Dashboard → User Settings |

---

## 📞 Quick Commands Reference

```powershell
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm test                       # Run unit tests

# Mobile
npm run build && npx cap sync  # Sync to mobile
npx cap run android            # Run on Android
npx cap open android           # Open in Android Studio

# Testing
npm run test:e2e               # E2E tests
npm run test:integration       # Integration tests
maestro test .maestro/         # Mobile UI tests

# Git
git checkout mostly_antigravity_build
git pull origin mostly_antigravity_build
git push origin mostly_antigravity_build
```

---

**You're all set! Happy coding! 🎉**
