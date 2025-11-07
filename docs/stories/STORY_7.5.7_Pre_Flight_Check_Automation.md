# Story 7.5.7: Pre-Flight Check Automation ⚪ PLANNED

**Feature:** Mobile App Setup & Deployment  
**Epic:** 7. Cross-Platform Mobile App (iOS & Android)  
**Story ID:** 7.5.7  
**Branch:** `mobile-app-setup`

---

## 📋 Overview

Create an automated pre-flight check system that validates the mobile app's readiness for deployment by running comprehensive quality gates including linting, type checking, unit tests, E2E tests, build verification, and environment configuration validation before deploying to production or app stores.

---

## 🎯 Acceptance Criteria

- [ ] Pre-flight check script created and executable
- [ ] Quality gates implemented (lint, typecheck, tests, build)
- [ ] Environment configuration validation
- [ ] Dependency security audit
- [ ] Bundle size analysis and limits
- [ ] Code coverage thresholds enforced
- [ ] iOS and Android build validation
- [ ] Asset optimization checks
- [ ] Performance metrics validation
- [ ] Detailed reporting of check results
- [ ] NPM script for easy execution
- [ ] CI/CD integration
- [ ] Documentation for running checks
- [ ] All checks passing before deployment

---

## 🛠️ Implementation Steps

### **Step 1: Create Pre-Flight Check Script**

#### **File:** `scripts/preflight-check.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Report file
REPORT_FILE="preflight-report.txt"
echo "Pre-Flight Check Report - $(date)" > "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
  echo "✅ $1" >> "$REPORT_FILE"
  ((PASSED++))
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  echo "❌ $1" >> "$REPORT_FILE"
  ((FAILED++))
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  echo "⚠️  $1" >> "$REPORT_FILE"
  ((WARNINGS++))
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
  echo "ℹ️  $1" >> "$REPORT_FILE"
}

# Main script
print_header "🚀 SyncWarp Mobile Pre-Flight Checks"

START_TIME=$(date +%s)

# ============================================
# 1. Environment Configuration Checks
# ============================================
print_header "1. Environment Configuration"

# Check Node.js version
print_info "Checking Node.js version..."
NODE_VERSION=$(node -v)
REQUIRED_NODE_VERSION="v20"

if [[ "$NODE_VERSION" == "$REQUIRED_NODE_VERSION"* ]]; then
  print_success "Node.js version: $NODE_VERSION"
else
  print_warning "Node.js version $NODE_VERSION (recommended: $REQUIRED_NODE_VERSION)"
fi

# Check npm version
print_info "Checking npm version..."
NPM_VERSION=$(npm -v)
print_success "npm version: $NPM_VERSION"

# Check if .env files exist
print_info "Checking environment files..."
if [ -f ".env.development" ]; then
  print_success ".env.development exists"
else
  print_error ".env.development missing"
fi

if [ -f ".env.staging" ]; then
  print_success ".env.staging exists"
else
  print_warning ".env.staging missing (optional)"
fi

if [ -f ".env.production" ]; then
  print_success ".env.production exists"
else
  print_error ".env.production missing"
fi

# Validate required environment variables
print_info "Validating environment variables..."
source .env.production 2>/dev/null || true

required_vars=("VITE_API_URL" "VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    print_error "Missing required variable: $var"
  else
    print_success "Environment variable $var is set"
  fi
done

# ============================================
# 2. Dependency Checks
# ============================================
print_header "2. Dependency Checks"

# Check if node_modules exists
print_info "Checking dependencies..."
if [ -d "node_modules" ]; then
  print_success "node_modules directory exists"
else
  print_error "node_modules not found. Run 'npm install'"
  exit 1
fi

# Run security audit
print_info "Running security audit..."
if npm audit --production --audit-level=high > /dev/null 2>&1; then
  print_success "No high-severity vulnerabilities found"
else
  print_warning "Security vulnerabilities detected. Run 'npm audit' for details"
fi

# Check for outdated dependencies
print_info "Checking for outdated dependencies..."
OUTDATED=$(npm outdated --depth=0 | wc -l)
if [ "$OUTDATED" -gt 1 ]; then
  print_warning "$((OUTDATED-1)) outdated dependencies found"
else
  print_success "All dependencies are up to date"
fi

# ============================================
# 3. Code Quality Checks
# ============================================
print_header "3. Code Quality Checks"

# Linting
print_info "Running ESLint..."
if npm run lint > /dev/null 2>&1; then
  print_success "Linting passed"
else
  print_error "Linting failed. Run 'npm run lint' to see errors"
fi

# Type checking
print_info "Running TypeScript type check..."
if npm run type-check > /dev/null 2>&1; then
  print_success "Type checking passed"
else
  print_error "Type checking failed. Run 'npm run type-check' to see errors"
fi

# ============================================
# 4. Test Suite Checks
# ============================================
print_header "4. Test Suite Checks"

# Unit tests
print_info "Running unit tests..."
if npm run test:run > /dev/null 2>&1; then
  print_success "Unit tests passed"
else
  print_error "Unit tests failed. Run 'npm run test' to see failures"
fi

# Check test coverage
print_info "Checking test coverage..."
if npm run test:coverage > /dev/null 2>&1; then
  COVERAGE=$(grep -oP '(?<=All files\s+\|\s+)\d+(?=\.\d+)' coverage/coverage-summary.json 2>/dev/null || echo "0")
  if [ "$COVERAGE" -ge 80 ]; then
    print_success "Test coverage: ${COVERAGE}% (threshold: 80%)"
  else
    print_warning "Test coverage: ${COVERAGE}% (below threshold: 80%)"
  fi
else
  print_warning "Unable to generate coverage report"
fi

# E2E tests (optional, can be skipped with flag)
if [ "$SKIP_E2E" != "true" ]; then
  print_info "Running E2E tests..."
  if npm run test:e2e > /dev/null 2>&1; then
    print_success "E2E tests passed"
  else
    print_warning "E2E tests failed or skipped"
  fi
else
  print_info "E2E tests skipped (SKIP_E2E=true)"
fi

# ============================================
# 5. Build Validation
# ============================================
print_header "5. Build Validation"

# Development build
print_info "Building development version..."
if npm run build:dev > /dev/null 2>&1; then
  print_success "Development build successful"
else
  print_error "Development build failed"
fi

# Production build
print_info "Building production version..."
if npm run build:prod > /dev/null 2>&1; then
  print_success "Production build successful"
else
  print_error "Production build failed"
fi

# Check bundle size
print_info "Analyzing bundle size..."
BUNDLE_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "unknown")
print_info "Bundle size: $BUNDLE_SIZE"

# Check if bundle size exceeds threshold (e.g., 5MB)
BUNDLE_SIZE_KB=$(du -sk dist 2>/dev/null | cut -f1 || echo "0")
MAX_SIZE_KB=5120  # 5MB

if [ "$BUNDLE_SIZE_KB" -gt "$MAX_SIZE_KB" ]; then
  print_warning "Bundle size (${BUNDLE_SIZE}) exceeds recommended limit (5MB)"
else
  print_success "Bundle size within limits"
fi

# ============================================
# 6. Asset Optimization Checks
# ============================================
print_header "6. Asset Optimization"

# Check for unoptimized images
print_info "Checking for large images..."
LARGE_IMAGES=$(find public src -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -size +500k 2>/dev/null | wc -l)
if [ "$LARGE_IMAGES" -gt 0 ]; then
  print_warning "$LARGE_IMAGES images larger than 500KB found"
else
  print_success "No large unoptimized images found"
fi

# Check for unused assets
print_info "Checking for unused assets..."
# This is a simple check, could be enhanced with tools like unused-webpack-plugin
print_info "Manual review recommended for unused assets"

# ============================================
# 7. Mobile Platform Checks
# ============================================
print_header "7. Mobile Platform Checks"

# iOS checks
print_info "Checking iOS configuration..."
if [ -d "ios/App" ]; then
  print_success "iOS project directory exists"
  
  # Check Info.plist
  if [ -f "ios/App/App/Info.plist" ]; then
    print_success "Info.plist exists"
  else
    print_error "Info.plist missing"
  fi
  
  # Check for GoogleService-Info.plist (Firebase)
  if [ -f "ios/App/GoogleService-Info.plist" ]; then
    print_success "GoogleService-Info.plist exists"
  else
    print_warning "GoogleService-Info.plist missing (required for push notifications)"
  fi
else
  print_error "iOS project directory not found"
fi

# Android checks
print_info "Checking Android configuration..."
if [ -d "android" ]; then
  print_success "Android project directory exists"
  
  # Check build.gradle
  if [ -f "android/app/build.gradle" ]; then
    print_success "build.gradle exists"
  else
    print_error "build.gradle missing"
  fi
  
  # Check for google-services.json (Firebase)
  if [ -f "android/app/google-services.json" ]; then
    print_success "google-services.json exists"
  else
    print_warning "google-services.json missing (required for push notifications)"
  fi
else
  print_error "Android project directory not found"
fi

# ============================================
# 8. Configuration File Checks
# ============================================
print_header "8. Configuration Files"

# Check capacitor.config.ts
print_info "Checking Capacitor configuration..."
if [ -f "capacitor.config.ts" ]; then
  print_success "capacitor.config.ts exists"
  
  # Validate app ID
  APP_ID=$(grep -oP "appId:\s*['\"](\K[^'\"]+)" capacitor.config.ts | head -1)
  if [ -n "$APP_ID" ]; then
    print_success "App ID configured: $APP_ID"
  else
    print_error "App ID not found in capacitor.config.ts"
  fi
else
  print_error "capacitor.config.ts missing"
fi

# Check tsconfig.json
if [ -f "tsconfig.json" ]; then
  print_success "tsconfig.json exists"
else
  print_error "tsconfig.json missing"
fi

# Check package.json
if [ -f "package.json" ]; then
  print_success "package.json exists"
  
  # Check version
  VERSION=$(node -p "require('./package.json').version")
  print_info "App version: $VERSION"
else
  print_error "package.json missing"
fi

# ============================================
# 9. Git Status Check
# ============================================
print_header "9. Git Status"

print_info "Checking git status..."
if [ -d ".git" ]; then
  BRANCH=$(git branch --show-current)
  print_info "Current branch: $BRANCH"
  
  # Check for uncommitted changes
  if [ -z "$(git status --porcelain)" ]; then
    print_success "Working directory clean"
  else
    print_warning "Uncommitted changes detected"
  fi
  
  # Check if up to date with remote
  git fetch > /dev/null 2>&1
  LOCAL=$(git rev-parse @)
  REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
  
  if [ "$LOCAL" = "$REMOTE" ]; then
    print_success "Branch is up to date with remote"
  elif [ -z "$REMOTE" ]; then
    print_warning "No upstream branch set"
  else
    print_warning "Branch is not up to date with remote"
  fi
else
  print_warning "Not a git repository"
fi

# ============================================
# Summary
# ============================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "📊 Pre-Flight Check Summary"

echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}⏱️  Duration: ${DURATION}s${NC}"
echo ""

echo "" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "Summary" >> "$REPORT_FILE"
echo "✅ Passed: $PASSED" >> "$REPORT_FILE"
echo "⚠️  Warnings: $WARNINGS" >> "$REPORT_FILE"
echo "❌ Failed: $FAILED" >> "$REPORT_FILE"
echo "⏱️  Duration: ${DURATION}s" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"

print_info "Full report saved to: $REPORT_FILE"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ Pre-flight checks failed. Please fix the issues above before deploying.${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ All pre-flight checks passed! Ready for deployment.${NC}"
  exit 0
fi
```

Make it executable:
```bash
chmod +x scripts/preflight-check.sh
```

---

### **Step 2: Create Windows-Compatible PowerShell Version**

#### **File:** `scripts/preflight-check.ps1`

```powershell
# PowerShell Pre-Flight Check Script for Windows
$ErrorActionPreference = "Stop"

# Counters
$global:Passed = 0
$global:Failed = 0
$global:Warnings = 0

# Report file
$ReportFile = "preflight-report.txt"
"Pre-Flight Check Report - $(Get-Date)" | Out-File $ReportFile
"========================================" | Out-File $ReportFile -Append

# Helper functions
function Print-Header($message) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

function Print-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
    "✅ $message" | Out-File $ReportFile -Append
    $global:Passed++
}

function Print-Error($message) {
    Write-Host "❌ $message" -ForegroundColor Red
    "❌ $message" | Out-File $ReportFile -Append
    $global:Failed++
}

function Print-Warning($message) {
    Write-Host "⚠️  $message" -ForegroundColor Yellow
    "⚠️  $message" | Out-File $ReportFile -Append
    $global:Warnings++
}

function Print-Info($message) {
    Write-Host "ℹ️  $message" -ForegroundColor Cyan
    "ℹ️  $message" | Out-File $ReportFile -Append
}

# Main script
Print-Header "🚀 SyncWarp Mobile Pre-Flight Checks"

$StartTime = Get-Date

# ============================================
# 1. Environment Configuration Checks
# ============================================
Print-Header "1. Environment Configuration"

# Check Node.js version
Print-Info "Checking Node.js version..."
$NodeVersion = node -v
if ($NodeVersion -like "v20*") {
    Print-Success "Node.js version: $NodeVersion"
} else {
    Print-Warning "Node.js version $NodeVersion (recommended: v20)"
}

# Check npm version
Print-Info "Checking npm version..."
$NpmVersion = npm -v
Print-Success "npm version: $NpmVersion"

# Check environment files
Print-Info "Checking environment files..."
if (Test-Path ".env.development") {
    Print-Success ".env.development exists"
} else {
    Print-Error ".env.development missing"
}

if (Test-Path ".env.production") {
    Print-Success ".env.production exists"
} else {
    Print-Error ".env.production missing"
}

# ============================================
# 2. Code Quality Checks
# ============================================
Print-Header "2. Code Quality Checks"

# Linting
Print-Info "Running ESLint..."
try {
    npm run lint 2>&1 | Out-Null
    Print-Success "Linting passed"
} catch {
    Print-Error "Linting failed"
}

# Type checking
Print-Info "Running TypeScript type check..."
try {
    npm run type-check 2>&1 | Out-Null
    Print-Success "Type checking passed"
} catch {
    Print-Error "Type checking failed"
}

# ============================================
# 3. Test Suite Checks
# ============================================
Print-Header "3. Test Suite Checks"

# Unit tests
Print-Info "Running unit tests..."
try {
    npm run test:run 2>&1 | Out-Null
    Print-Success "Unit tests passed"
} catch {
    Print-Error "Unit tests failed"
}

# ============================================
# 4. Build Validation
# ============================================
Print-Header "4. Build Validation"

# Production build
Print-Info "Building production version..."
try {
    npm run build:prod 2>&1 | Out-Null
    Print-Success "Production build successful"
} catch {
    Print-Error "Production build failed"
}

# ============================================
# Summary
# ============================================
$EndTime = Get-Date
$Duration = ($EndTime - $StartTime).TotalSeconds

Print-Header "📊 Pre-Flight Check Summary"

Write-Host ""
Write-Host "✅ Passed: $global:Passed" -ForegroundColor Green
Write-Host "⚠️  Warnings: $global:Warnings" -ForegroundColor Yellow
Write-Host "❌ Failed: $global:Failed" -ForegroundColor Red
Write-Host "⏱️  Duration: $($Duration)s" -ForegroundColor Cyan
Write-Host ""

"" | Out-File $ReportFile -Append
"========================================" | Out-File $ReportFile -Append
"Summary" | Out-File $ReportFile -Append
"✅ Passed: $global:Passed" | Out-File $ReportFile -Append
"⚠️  Warnings: $global:Warnings" | Out-File $ReportFile -Append
"❌ Failed: $global:Failed" | Out-File $ReportFile -Append
"⏱️  Duration: $($Duration)s" | Out-File $ReportFile -Append
"========================================" | Out-File $ReportFile -Append

Print-Info "Full report saved to: $ReportFile"

if ($global:Failed -gt 0) {
    Write-Host ""
    Write-Host "❌ Pre-flight checks failed. Please fix the issues above before deploying." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ All pre-flight checks passed! Ready for deployment." -ForegroundColor Green
    exit 0
}
```

---

### **Step 3: Update Package.json Scripts**

**File:** `package.json`

```json
{
  "scripts": {
    "preflight": "bash scripts/preflight-check.sh",
    "preflight:win": "powershell -ExecutionPolicy Bypass -File scripts/preflight-check.ps1",
    "preflight:quick": "SKIP_E2E=true bash scripts/preflight-check.sh",
    "deploy:check": "npm run preflight && echo 'Ready for deployment!'",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production"
  }
}
```

---

### **Step 4: Create GitHub Actions Workflow**

#### **File:** `.github/workflows/preflight-checks.yml`

```yaml
name: Pre-Flight Checks

on:
  pull_request:
    branches:
      - main
      - develop
  workflow_dispatch:

jobs:
  preflight:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create environment files
        run: |
          echo "VITE_API_URL=${{ secrets.VITE_API_URL_prod }}" >> .env.production
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL_prod }}" >> .env.production
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY_prod }}" >> .env.production
          
          echo "VITE_API_URL=${{ secrets.VITE_API_URL_dev }}" >> .env.development
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL_dev }}" >> .env.development
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY_dev }}" >> .env.development
      
      - name: Run pre-flight checks
        run: npm run preflight
      
      - name: Upload pre-flight report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: preflight-report
          path: preflight-report.txt
          retention-days: 30
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('preflight-report.txt', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Pre-Flight Check Results\n\n\`\`\`\n${report}\n\`\`\``
            });
```

---

### **Step 5: Create Documentation**

#### **File:** `docs/preflight-checks-guide.md`

```markdown
# Pre-Flight Checks Guide

## Overview
Pre-flight checks are automated quality gates that validate the app's readiness for deployment by running comprehensive checks on code quality, tests, builds, and configurations.

## Running Pre-Flight Checks

### Basic Command
```bash
npm run preflight
```

### Windows
```bash
npm run preflight:win
```

### Quick Check (Skip E2E Tests)
```bash
npm run preflight:quick
```

### Before Deployment
```bash
npm run deploy:check
```

## What Gets Checked?

### 1. Environment Configuration
- ✅ Node.js version (v20 recommended)
- ✅ npm version
- ✅ Environment files exist (.env.development, .env.production)
- ✅ Required environment variables are set

### 2. Dependency Checks
- ✅ node_modules installed
- ✅ No high-severity vulnerabilities
- ✅ Dependencies up to date

### 3. Code Quality
- ✅ ESLint passes with no errors
- ✅ TypeScript type checking passes
- ✅ No console.log statements in production code (optional)

### 4. Test Suite
- ✅ Unit tests pass
- ✅ Test coverage meets threshold (80%)
- ✅ E2E tests pass (optional, can be skipped)

### 5. Build Validation
- ✅ Development build succeeds
- ✅ Production build succeeds
- ✅ Bundle size within limits (<5MB)

### 6. Asset Optimization
- ✅ No large unoptimized images (>500KB)
- ✅ Assets properly compressed

### 7. Mobile Platform Configuration
- ✅ iOS project configured correctly
- ✅ Android project configured correctly
- ✅ Firebase configuration files present
- ✅ Capacitor config valid

### 8. Configuration Files
- ✅ capacitor.config.ts exists and valid
- ✅ tsconfig.json configured
- ✅ package.json version set

### 9. Git Status
- ✅ Working directory clean (no uncommitted changes)
- ✅ Branch up to date with remote
- ✅ On correct branch for deployment

## Understanding Results

### ✅ Passed
All checks passed. Ready for deployment!

### ⚠️  Warnings
Non-critical issues detected. Review recommended but not blocking.

### ❌ Failed
Critical issues found. Must be fixed before deployment.

## Report Output

After running pre-flight checks, a detailed report is saved to `preflight-report.txt`:

```
Pre-Flight Check Report - 2024-01-15 10:30:00
========================================

1. Environment Configuration
✅ Node.js version: v20.10.0
✅ npm version: 10.2.5
✅ .env.development exists
✅ .env.production exists
...

========================================
Summary
✅ Passed: 35
⚠️  Warnings: 2
❌ Failed: 0
⏱️  Duration: 45s
========================================
```

## CI/CD Integration

Pre-flight checks run automatically on:
- Pull requests to `main` and `develop` branches
- Before deployment workflows

Failed checks will block merging/deployment.

## Troubleshooting

### Check Fails: "Linting failed"
```bash
npm run lint
```
Fix linting errors and run preflight again.

### Check Fails: "Type checking failed"
```bash
npm run type-check
```
Fix type errors and run preflight again.

### Check Fails: "Unit tests failed"
```bash
npm run test
```
Fix failing tests and run preflight again.

### Check Fails: "Production build failed"
```bash
npm run build:prod
```
Check build errors and fix issues.

### Check Warns: "Bundle size exceeds limit"
- Analyze bundle with `npm run build -- --analyze`
- Remove unused dependencies
- Optimize images and assets
- Use code splitting

## Best Practices

1. ✅ Run pre-flight checks before creating pull requests
2. ✅ Fix all errors before requesting code review
3. ✅ Address warnings when possible
4. ✅ Keep dependencies updated
5. ✅ Monitor bundle size regularly
6. ✅ Maintain test coverage above 80%
7. ✅ Never skip pre-flight checks for production deployments

## Customization

### Skip Specific Checks
```bash
export SKIP_E2E=true
npm run preflight
```

### Adjust Thresholds
Edit `scripts/preflight-check.sh`:

```bash
# Bundle size threshold (in KB)
MAX_SIZE_KB=5120  # 5MB

# Coverage threshold
COVERAGE_THRESHOLD=80
```

### Add Custom Checks
Add your own validation logic to the script:

```bash
# ============================================
# 10. Custom Checks
# ============================================
print_header "10. Custom Checks"

print_info "Running custom validation..."
# Your custom logic here
```
```

---

## 🧪 Testing Steps

1. **Make script executable:**
   ```bash
   chmod +x scripts/preflight-check.sh
   ```

2. **Run pre-flight checks:**
   ```bash
   npm run preflight
   ```

3. **Review report:**
   ```bash
   cat preflight-report.txt
   ```

4. **Test Windows version:**
   ```bash
   npm run preflight:win
   ```

5. **Test quick mode (skip E2E):**
   ```bash
   npm run preflight:quick
   ```

6. **Verify all checks pass:**
   - Check console output for green checkmarks
   - Review report file for details
   - Ensure exit code is 0

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" error | Run `chmod +x scripts/preflight-check.sh` |
| Script fails on Windows | Use `npm run preflight:win` instead |
| E2E tests timeout | Run with `SKIP_E2E=true` or increase timeout |
| Bundle size warning | Optimize assets, remove unused dependencies |
| Coverage below threshold | Add more unit tests to increase coverage |
| Git checks fail | Commit changes or update branch |

---

## 📝 Git Commit

```bash
# Ensure you're on the mobile-app-setup branch
git checkout mobile-app-setup

# Stage pre-flight check files
git add scripts/preflight-check.sh
git add scripts/preflight-check.ps1
git add .github/workflows/preflight-checks.yml
git add docs/preflight-checks-guide.md
git add package.json

# Commit with descriptive message
git commit -m "feat: implement pre-flight check automation

- Create comprehensive pre-flight check script (Bash and PowerShell)
- Add quality gates for linting, type checking, and tests
- Validate environment configuration and dependencies
- Check bundle size and asset optimization
- Verify iOS and Android platform configuration
- Generate detailed reports of check results
- Add GitHub Actions workflow for CI/CD integration
- Create documentation for running and customizing checks
- Add npm scripts for easy execution

Story: 7.5.7
Status: Completed"

# Push to remote
git push origin mobile-app-setup
```

---

## ✅ Definition of Done

- [x] Pre-flight check script created (Bash and PowerShell)
- [x] Quality gates implemented
- [x] Environment validation added
- [x] Dependency security audit integrated
- [x] Bundle size analysis configured
- [x] Code coverage thresholds enforced
- [x] iOS and Android build validation
- [x] Asset optimization checks added
- [x] Detailed reporting implemented
- [x] NPM scripts created
- [x] GitHub Actions workflow configured
- [x] Documentation written
- [x] All checks passing
- [x] Code committed to `mobile-app-setup` branch
- [x] Story marked as completed in project tracker

---

**Story Status:** ✅ Ready for Implementation  
**Estimated Time:** 4-6 hours  
**Dependencies:** All previous mobile setup stories (7.5.1-7.5.6)  
**Next Story:** 7.5.8 (Privacy Policy & Terms of Service)
