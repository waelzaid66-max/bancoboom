---
name: BANCO mobile permission minimization (no camera/mic)
description: The app never records; how to keep CAMERA + RECORD_AUDIO/microphone off across iOS + Android
---

# BANCO mobile requests NO camera or microphone

**Rule:** The app NEVER launches the camera or records audio — every media flow
uses the photo LIBRARY picker only (`launchImageLibraryAsync`). So both CAMERA
and microphone must stay OFF.

**Why / gotcha:** The `expo-image-picker` config plugin RE-ADDS, by default, BOTH
the camera AND microphone permissions (Android `CAMERA` + `RECORD_AUDIO`; iOS
`NSCameraUsageDescription` + `NSMicrophoneUsageDescription`). Deleting the manual
entries is NOT enough — you must ALSO set `cameraPermission: false` AND
`microphonePermission: false` on the plugin, or they silently return on the next
prebuild. (RECORD_AUDIO only matters for capturing video WITH the camera; picking
an existing video from the library never needs it.) This is app-store data-safety
minimization.

**How to apply / verify:**
- Verify the RESOLVED native config, not the source JSON:
  `expo config --type introspect --json` → inspect `android.permissions` and
  `ios.infoPlist`. CAMERA / RECORD_AUDIO / NSCamera* / NSMicrophone* must all be
  ABSENT. (Source-JSON inspection misses plugin-injected permissions.)
- If anyone adds `launchCameraAsync`, flip both plugin flags back to strings.
- `android.permissions: []` does NOT strip permissions other modules genuinely
  need (location, biometric, notifications) — those still merge in.
