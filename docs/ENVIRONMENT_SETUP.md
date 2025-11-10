# Environment Configuration Guide

This guide explains how to configure and manage different environments (development, staging, production) for the Sync App.

---

## 📋 Overview

The app supports three environments:
- **Development** (`dev`) - Local development with debug features
- **Staging** (`staging`) - Pre-production testing environment
- **Production** (`prod`) - Live production environment

Each environment has:
- Separate environment variables
- Different app IDs (allows side-by-side installation)
- Different app names
- Different API endpoints
- Different feature flags

---

## 🔧 Setup Instructions

### 1. Copy Environment Files

The repository includes template environment files:

```bash
# Development (copy and fill in your values)
cp .env.example .env.development

# Staging (copy and fill in your values)
cp .env.example .env.staging

# Production (copy and fill in your values)
cp .env.example .env.production
```

### 2. Fill in Environment Variables

Open each `.env.*` file and replace placeholder values:

#### Required Variables

```env
# Supabase (get from https://app.supabase.com/project/_/settings/api)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Maps (get from https://console.cloud.google.com)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key-here
```

#### Environment-Specific Values

**Development:**
```env
VITE_APP_ENV=development
VITE_APP_NAME=Sync Dev
VITE_API_BASE_URL=http://localhost:54321
VITE_ENABLE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

**Staging:**
```env
VITE_APP_ENV=staging
VITE_APP_NAME=Sync Staging
VITE_API_BASE_URL=https://staging-api.syncapp.com
VITE_ENABLE_DEBUG_MODE=true
VITE_LOG_LEVEL=info
```

**Production:**
```env
VITE_APP_ENV=production
VITE_APP_NAME=Sync App
VITE_API_BASE_URL=https://api.syncapp.com
VITE_ENABLE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

---

## 🏗️ Building for Different Environments

### Development Build

```bash
# Build web app
npm run build:dev

# Sync with mobile platforms
npm run mobile:sync:dev

# Open in Android Studio
npm run mobile:android:dev

# Open in Xcode
npm run mobile:ios:dev
```

### Staging Build

```bash
# Build web app
npm run build:staging

# Sync with mobile platforms
npm run mobile:sync:staging

# Open in Android Studio
npm run mobile:android:staging

# Open in Xcode
npm run mobile:ios:staging
```

### Production Build

```bash
# Build web app
npm run build:prod

# Sync with mobile platforms
npm run mobile:sync:prod

# Open in Android Studio
npm run mobile:android:prod

# Open in Xcode
npm run mobile:ios:prod
```

---

## 📱 Mobile App Configuration

### App IDs (Bundle Identifiers)

Each environment has a unique app ID allowing side-by-side installation:

| Environment | Android Package | iOS Bundle ID |
|-------------|----------------|---------------|
| Development | `com.syncapp.mobile.dev` | `com.syncapp.mobile.dev` |
| Staging | `com.syncapp.mobile.staging` | `com.syncapp.mobile.staging` |
| Production | `com.syncapp.mobile` | `com.syncapp.mobile` |

### App Names

| Environment | Display Name |
|-------------|-------------|
| Development | Sync Dev |
| Staging | Sync Staging |
| Production | Sync App |

---

## 🔍 Environment Variables Reference

### Application Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_ENV` | Current environment | `development` |
| `VITE_APP_NAME` | App display name | `Sync Dev` |
| `VITE_APP_VERSION` | App version | `1.0.0-dev` |

### Supabase Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |

### API Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base API URL | `http://localhost:54321` |
| `VITE_API_TIMEOUT` | API timeout (ms) | `30000` |

### Feature Flags

| Variable | Description | Dev | Staging | Prod |
|----------|-------------|-----|---------|------|
| `VITE_ENABLE_OFFLINE_MODE` | Offline functionality | ✅ | ✅ | ✅ |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | Push notifications | ✅ | ✅ | ✅ |
| `VITE_ENABLE_DEBUG_MODE` | Debug features | ✅ | ✅ | ❌ |
| `VITE_ENABLE_ERROR_REPORTING` | Error tracking | ❌ | ✅ | ✅ |

### Logging

| Variable | Description | Values |
|----------|-------------|--------|
| `VITE_LOG_LEVEL` | Log verbosity | `debug`, `info`, `warn`, `error` |
| `VITE_ENABLE_CONSOLE_LOGS` | Show console logs | `true`, `false` |

### Mobile Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_MOBILE_DEEP_LINK_SCHEME` | Deep link URL scheme | `syncapp-dev://` |
| `VITE_CAPACITOR_SERVER_URL` | Web assets URL | `http://localhost:5173` |

---

## 🧪 Testing Environment Configuration

### Check Current Environment

Add this to your app to verify environment:

```typescript
// src/lib/env.ts
export const config = {
  env: import.meta.env.VITE_APP_ENV,
  appName: import.meta.env.VITE_APP_NAME,
  version: import.meta.env.VITE_APP_VERSION,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  isDebug: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  isDevelopment: import.meta.env.VITE_APP_ENV === 'development',
  isStaging: import.meta.env.VITE_APP_ENV === 'staging',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
};

// Log current environment on app start
console.log('Environment:', config.env);
console.log('App Name:', config.appName);
console.log('Version:', config.version);
```

### Verify in Browser Console

```javascript
// Open browser console and run:
console.log('Environment:', import.meta.env.VITE_APP_ENV);
console.log('All env vars:', import.meta.env);
```

---

## 🚀 Deployment Checklist

### Before Deploying to Staging

- [ ] `.env.staging` file exists and is filled out
- [ ] Staging Supabase project is set up
- [ ] Staging API endpoints are working
- [ ] Build succeeds: `npm run build:staging`
- [ ] Mobile sync succeeds: `npm run mobile:sync:staging`
- [ ] App installs on device with "Sync Staging" name
- [ ] All features work correctly

### Before Deploying to Production

- [ ] `.env.production` file exists and is filled out
- [ ] Production Supabase project is set up
- [ ] Production API endpoints are working
- [ ] Debug mode is disabled: `VITE_ENABLE_DEBUG_MODE=false`
- [ ] Console logs are disabled: `VITE_ENABLE_CONSOLE_LOGS=false`
- [ ] Error reporting is enabled: `VITE_ENABLE_ERROR_REPORTING=true`
- [ ] Build succeeds: `npm run build:prod`
- [ ] Mobile sync succeeds: `npm run mobile:sync:prod`
- [ ] App installs on device with "Sync App" name
- [ ] All tests pass
- [ ] Performance is acceptable

---

## 🔒 Security Best Practices

### DO ✅

- ✅ Keep `.env.*` files in `.gitignore`
- ✅ Use different Supabase projects for each environment
- ✅ Use environment variables for all secrets
- ✅ Disable debug mode in production
- ✅ Use HTTPS in staging and production
- ✅ Rotate keys regularly
- ✅ Use separate Google Maps API keys per environment

### DON'T ❌

- ❌ Commit `.env.*` files to git
- ❌ Share production credentials in development
- ❌ Use production database for testing
- ❌ Enable debug mode in production
- ❌ Log sensitive data in production
- ❌ Use same API keys across environments

---

## 🐛 Troubleshooting

### Environment variables not loading

**Problem**: `import.meta.env.VITE_*` returns `undefined`

**Solutions**:
1. Ensure file is named exactly `.env.development`, `.env.staging`, or `.env.production`
2. Ensure variables start with `VITE_` prefix
3. Restart dev server after changing env files: `npm run dev`
4. Check that `--mode` flag matches: `vite build --mode production`

### Wrong environment loaded

**Problem**: App shows "Sync Dev" but should be "Sync Staging"

**Solutions**:
1. Check `VITE_APP_ENV` in your `.env.*` file
2. Ensure you're using the correct build command: `npm run build:staging`
3. Clear build cache: `rm -rf dist && npm run build:staging`
4. Re-sync mobile platforms: `npm run mobile:sync:staging`

### Multiple apps installed with same name

**Problem**: Can't distinguish between dev/staging/prod apps on device

**Solutions**:
1. Ensure `capacitor.config.ts` has dynamic app IDs
2. Rebuild app completely:
   ```bash
   # Clean builds
   rm -rf android/app/build
   rm -rf ios/App/build
   
   # Rebuild
   npm run build:dev
   npx cap sync
   ```
3. Check app ID in Android Studio: `android/app/build.gradle` (applicationId)
4. Check bundle ID in Xcode: Select target → General → Bundle Identifier

### Environment variables not available at runtime

**Problem**: Environment variables work in build but not at runtime

**Explanation**: Vite replaces `import.meta.env.*` at build time, not runtime.

**Solution**: Always rebuild when changing environments:
```bash
npm run build:dev    # For dev
npm run build:staging    # For staging
npm run build:prod    # For prod
```

---

## 📚 Related Documentation

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Capacitor Configuration](https://capacitorjs.com/docs/config)
- [Multi-Environment Build System](./MULTI_ENVIRONMENT_BUILD.md) *(Story 7.5.4)*
- [Supabase Setup Guide](./SUPABASE_SETUP_GUIDE.md)

---

## ✅ Story 7.5.3 Checklist

- [✅] `.env.development` created
- [✅] `.env.staging` created
- [✅] `.env.production` created
- [✅] `.env.example` updated with all variables
- [✅] `.gitignore` updated to exclude env files
- [✅] `capacitor.config.ts` supports dynamic environments
- [✅] Documentation created

**Status**: ✅ COMPLETE

---

**Last Updated**: 2025-11-10  
**Story**: 7.5.3 - Environment Configuration Files
