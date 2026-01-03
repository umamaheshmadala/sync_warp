# Maestro Mobile Automation

This directory contains Maestro flows for automated mobile UI testing.

## Prerequisites

1. **Install Maestro CLI:**
   ```bash
   curl -Ls https://get.maestro.mobile.dev | bash
   ```

2. **Android Setup:**
   - Android Studio installed
   - Android Emulator running (API 28+)
   - App installed: `npx cap run android`

3. **iOS Setup (macOS only):**
   - Xcode installed
   - iOS Simulator running
   - App installed: `npx cap run ios`

## Running Tests

### Single Flow
```bash
# Login flow
maestro test .maestro/flows/login.yaml

# Send message flow
maestro test .maestro/flows/send-message.yaml

# Full journey
maestro test .maestro/flows/full-journey.yaml
```

### All Flows
```bash
maestro test .maestro/flows/
```

### With Recording
```bash
maestro record .maestro/flows/full-journey.yaml
```

### Debug Mode
```bash
maestro studio
```

## Flow Descriptions

| Flow | Description |
|------|-------------|
| `login.yaml` | Automates login with test credentials |
| `send-message.yaml` | Opens conversation and sends a message |
| `full-journey.yaml` | Complete E2E: Login → Messages → Send → Profile |

## Test Data

- **Email:** `testuser1@gmail.com`
- **Password:** `Password123!`

> ⚠️ Update credentials in flow files if test user changes.

## Screenshots

Screenshots are saved in `.maestro/screenshots/` during test runs.

## Troubleshooting

- **App not found:** Run `adb devices` (Android) or `xcrun simctl list` (iOS)
- **Element not found:** Use `maestro studio` to inspect app hierarchy
- **Timeout:** Increase wait times with `- waitForAnimationToEnd: maxWait: 10000`
