#!/bin/bash

# Fix iOS Build Script
# usage: ./fix_ios_build.sh

echo "🔍 Starting deep cleanup for iOS build..."

# 1. Clear extended attributes (recursively) from the entire project
# This fixes "resource fork, Finder information, or similar detritus not allowed" errors
echo "🧹 Removing extended attributes (xattr -cr)..."
xattr -cr .

# 2. Specifically target known Cloud/Finder attributes if strict clear failed
# Ignore errors if attributes don't exist
echo "🧹 Removing specific attributes..."
find . -type f -name "*" -exec xattr -d com.apple.provenance {} + 2>/dev/null
find . -type f -name "*" -exec xattr -d com.apple.ResourceFork {} + 2>/dev/null
find . -type f -name "*" -exec xattr -d com.apple.FinderInfo {} + 2>/dev/null

# 3. Remove AppleDouble files
echo "🧹 Removing ._ AppleDouble files..."
find . -name "._*" -delete

# 4. Clear DerivedData (The build artifact cache)
echo "🗑️  Removing ios/DerivedData..."
rm -rf ios/DerivedData

# 5. Clean Xcode project
echo "settings Clean Xcode project..."
cd ios
xcodebuild -workspace App/App.xcworkspace -scheme App clean
cd ..

# 6. Rebuild and Deploy
echo "🚀 Building web assets..."
npm run build

echo "🔄 Syncing to Capacitor..."
npx cap sync

echo "🧹 Cleaning ios directory one last time..."
xattr -cr ios

echo "📱 Deploying to device..."
npx cap run ios --target 00008130-000A5D0E24298D3A
