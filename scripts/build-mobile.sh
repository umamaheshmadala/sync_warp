#!/bin/bash
#
# Mobile App Build Script
# Builds the web app with environment-specific configuration and syncs with Capacitor platforms
#
# Usage:
#   ./scripts/build-mobile.sh [dev|staging|prod] [android|ios]
#
# Examples:
#   ./scripts/build-mobile.sh dev android
#   ./scripts/build-mobile.sh prod ios
#

set -e  # Exit on error

# Default values
ENV=${1:-dev}
PLATFORM=${2:-android}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Validate environment
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENV"
    echo "Usage: $0 [dev|staging|prod] [android|ios]"
    exit 1
fi

# Validate platform
if [[ ! "$PLATFORM" =~ ^(android|ios)$ ]]; then
    print_error "Invalid platform: $PLATFORM"
    echo "Usage: $0 [dev|staging|prod] [android|ios]"
    exit 1
fi

# Script header
echo ""
echo -e "${MAGENTA}🚀 Mobile Build Script${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_info "Environment: $ENV"
print_info "Platform: $PLATFORM"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_error "node_modules not found. Run 'npm install' first."
    exit 1
fi

# Step 1: Build web app
print_info "Step 1: Building web app for $ENV environment..."
if npm run "build:$ENV"; then
    print_success "Web app built successfully"
else
    print_error "Failed to build web app"
    exit 1
fi

# Step 2: Sync with Capacitor
print_info "Step 2: Syncing with $PLATFORM platform..."
if npx cap sync "$PLATFORM"; then
    print_success "Platform synced successfully"
else
    print_error "Failed to sync platform"
    exit 1
fi

# Step 3: Open in IDE
print_info "Step 3: Opening $PLATFORM in IDE..."
if npx cap open "$PLATFORM"; then
    print_success "IDE opened successfully"
else
    print_warning "Failed to open IDE automatically. Open manually."
fi

# Success message
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_success "Build complete!"
echo ""

# Display next steps
echo -e "${YELLOW}📱 Next Steps:${NC}"
if [ "$PLATFORM" = "android" ]; then
    echo "   1. Wait for Android Studio to open"
    echo "   2. Select build variant: $ENV"
    echo -e "      ${CYAN}- Build → Select Build Variant → choose '${ENV}Debug' or '${ENV}Release'${NC}"
    echo "   3. Run on device or emulator"
else
    echo "   1. Wait for Xcode to open"
    echo "   2. Select appropriate scheme"
    echo "   3. Run on device or simulator"
fi

# Display app info
echo ""
echo -e "${YELLOW}📦 App Information:${NC}"
case "$ENV" in
    dev)
        echo "   Name: Sync Dev"
        echo "   ID: com.syncapp.mobile.dev"
        ;;
    staging)
        echo "   Name: Sync Staging"
        echo "   ID: com.syncapp.mobile.staging"
        ;;
    prod)
        echo "   Name: Sync App"
        echo "   ID: com.syncapp.mobile"
        ;;
esac
echo ""
