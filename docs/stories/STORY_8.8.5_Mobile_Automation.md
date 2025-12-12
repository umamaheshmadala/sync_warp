# 🧪 STORY 8.8.5: Mobile Automation & Device Testing

**Parent Epic:** [EPIC 8.8 - Testing & QA](../epics/EPIC_8.8_Testing_QA.md)
**Priority:** P2 - Medium
**Estimated Effort:** 2 Days
**Dependencies:** Story 8.8.1

---

## 🎯 **Goal**
Implement **automated mobile UI testing using Maestro** for reproducible regression testing, supplemented by manual testing for hardware-specific features (Camera, Haptics).

---

## 📋 **Acceptance Criteria**

### 1. Automated Testing (Maestro)
- [ ] **Maestro Setup**: Configured for Android/iOS simulators.
- [ ] **Flows**: Login -> Open List -> Send Message flow automated.
- [ ] **CI Integration**: Maestro flows runnable locally.

### 2. Manual Device Validation
- [ ] **Hardware**: Camera permission and capture verified on physical device.
- [ ] **Haptics**: Vibration verified on message send.
- [ ] **Push Notifications**: Verify notification delivery on iOS simulator (via APNs sandbox) and Android emulator (via FCM).
- [ ] **Network Transitions**: Verify app behavior when switching from WiFi to Cellular and vice-versa.
- [ ] **Crash Reporting**: Sentry/LogRocket basic integration for capturing native crashes during test sessions.

---

## 🧩 **Implementation Details**

### Maestro Flow (`flow.yaml`)
```yaml
appId: com.syncwarp.app
---
- launchApp
- tapOn: "Login"
- inputText: "test@user.com"
- tapOn: "Submit"
- assertVisible: "Messages"
```

---

## 🤖 **MCP Integration Strategy**

### Chrome DevTools MCP
- **Webview Debugging**: `warp mcp run chrome-devtools "inspect mobile webview"` while running Maestro flow to see JS errors.

---

## 🧪 **Testing Plan**
1. `maestro test .maestro/flow.yaml`
2. Manual Checklist for Camera/Haptics.
