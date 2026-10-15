---
name: Cross-platform appearance override
description: How Outfit synchronizes explicit theme modes across Expo native and web.
---

Set the shared design-system color-scheme override on every platform so `GlassView` and `GradientBackground` follow the app's selected mode. Call `Appearance.setColorScheme` only on iOS and Android.

**Why:** React Native Web exposes `Appearance.setColorScheme` as a callable stub that throws at runtime, even though it passes a `typeof` function check.

**How to apply:** For `system`, clear the shared override and pass `null` to native Appearance; for explicit light/dark modes, set both the shared override and native Appearance.
