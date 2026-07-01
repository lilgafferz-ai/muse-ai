# 📱 Nexora Mobile — Full-Control Android Assistant (build plan)

Goal: **Nex as an admin over your phone** — files, contacts, SMS, calls, camera,
location, system settings, and on-screen control of any app — driven by Nex's
brain (Ollama backend or on-device LLM), hands-free by voice ("Nex").

> **iOS reality:** iOS sandboxes apps so hard that contacts-automation, SMS,
> settings control, and app control are **not possible** without a jailbreak.
> The iOS build is a *limited companion*: chat + voice + mic/camera + push +
> Siri Shortcuts hooks. Everything below (real control) is **Android-only**.

---

## Architecture

```
        VOICE / CHAT
             │
      ┌──────▼───────┐        HTTP        ┌────────────────────┐
      │  Nex Mobile   │◄─────────────────►│  Nex Brain          │
      │  (React Native)│                   │  (backend + Ollama  │
      │               │                   │   or on-device LLM) │
      └──────┬────────┘                   └────────────────────┘
             │ tool call {tool, action, params}
      ┌──────▼──────────────────────────────────────┐
      │  MobileToolRegistry  (mirrors desktop tools) │
      └──┬────────┬─────────┬──────────┬─────────────┘
         │        │         │          │
   Permission  Shizuku    Root(su)  Accessibility
     APIs     (ADB-priv)  (full)     Service
         │        │         │          │
   contacts    settings   any shell  read screen +
   sms/calls   pm/am/svc  all-files  tap/swipe/type
   camera/loc  input/cmd             on ANY app
```

Nex decides an action → emits a tool call → `MobileToolRegistry` dispatches to
the right executor → result returns to Nex → Nex replies by voice/text.
A foreground **background service** keeps Nex alive and listening for "Nex".

---

## Control tiers (how "full admin" actually works on Android)

| Tier | Unlocks | Setup cost |
|------|---------|-----------|
| **Runtime permissions** | contacts, SMS, calls, camera, mic, location, calendar, coarse file access | normal — user taps "Allow" |
| **Special access** | all-files access, notification reading, **Accessibility** (control any app) | user enables manually in Settings |
| **Shizuku** (recommended) | change (almost) any system setting, install/uninstall/force-stop apps, grant perms, `input` automation, screenshots — **ADB-level power, no permanent root** | user starts Shizuku via wireless debugging (Android 11+) or root |
| **Root (su)** | literally everything — system files, any setting, other apps' private data | requires a rooted device (Magisk) |

**Recommendation:** build to **Shizuku first** (covers ~95% of "admin" safely),
add **Accessibility** for on-screen app control, and treat full **root** as an
optional Phase-5 power mode.

---

## Capability matrix

| Capability | Mechanism | Tier | Lib / native |
|-----------|-----------|------|--------------|
| Read/write **contacts** | ContactsContract | permission | `react-native-contacts` |
| Read/**send SMS** | SmsManager / content resolver | permission* | `react-native-sms` + native reader |
| **Calls** (dial, log, detect) | Intent + PhoneStateListener | permission | `react-native-call-detection` |
| **Camera / photos** | CameraX | permission | `react-native-vision-camera` |
| **Location** | FusedLocation | permission | `@react-native-community/geolocation` |
| **Files** (all) | MANAGE_EXTERNAL_STORAGE / SAF | special | native + `react-native-fs` |
| **Notifications** (read others) | NotificationListenerService | special | native module |
| **Control any app** (tap/read) | AccessibilityService | special | native module |
| **Launch** apps | Intent | permission | Linking |
| **Force-stop / uninstall / install** | `pm` / `am` | Shizuku/root | Shizuku API |
| **Wi-Fi / BT / airplane / brightness / volume** | `settings` / `svc` / `cmd` | Shizuku/root | Shizuku API |
| **Screenshot / screen record** | `screencap` / MediaProjection | Shizuku/perm | native |
| **Input automation** (tap/swipe/type) | `input` | Shizuku/root | Shizuku API |
| **Anything else** | arbitrary `su` shell | root | native |

\* Google Play restricts SMS/Call-Log permissions; a sideloaded/self-signed
build avoids that (fine for a personal admin app).

---

## Safety (non-negotiable — an LLM with admin WILL make mistakes)

- **Confirmation gates** on destructive actions: delete files, factory reset,
  uninstall, send money, mass SMS, disable security. Nex must ask first (voice/tap).
- **Per-capability toggles** in Settings — you decide what Nex may touch.
- **Audit log** — every action Nex takes is recorded and reviewable.
- **Allow-list for shell** — mirror the hardened desktop `systemTool` (block
  chaining/injection; explicit allow-list; unlisted commands need confirmation).

---

## Phased build order

- **Phase 0 — Toolchain:** Android Studio + SDK + JDK; a physical device with
  USB/wireless debugging; install the **Shizuku** app.
- **Phase 1 — Foundation:** RN app boots, connects to Nex brain, chat + voice on
  phone, background service + "Nex" wake word, permission manager.
- **Phase 2 — Standard capabilities:** contacts, SMS, calls, camera, location, files.
- **Phase 3 — Shizuku:** settings toggles, app management, input automation, screenshots.
- **Phase 4 — Accessibility:** read the screen + control any app (the "do anything" tier).
- **Phase 5 — Root (optional):** `su` for full system-level control.

Each phase is built by me, then compiled & tested by you on-device.

---

## What you need to set up (Phase 0)

1. **Android Studio** (+ Android SDK, platform-tools, an SDK build target).
2. **JDK 17** and Node ≥ 18 (already have Node).
3. A **physical Android phone** (emulators can't do Shizuku/root cleanly),
   Developer Options → USB debugging on.
4. The **Shizuku** app (Play Store) — started via wireless debugging (Android 11+)
   or root.
5. (Optional, Phase 5) A **rooted** device (Magisk).

Once that's ready, Phase 1 is a real, runnable app.
