---
name: Cross-platform appearance override
description: How Outfit synchronizes explicit theme modes across Expo native and web.
---

Resolve `system` versus explicit light/dark mode once in the app ThemeProvider. Always set the shared design-system override to the resolved `light` or `dark` scheme, including when the saved mode is `system`. Call `Appearance.setColorScheme(null)` for system mode and an explicit scheme for fixed modes, on native only.

**Why:** React Native Web exposes `Appearance.setColorScheme` as a callable stub that throws at runtime, even though it passes a `typeof` function check.

**How to apply:** Keep `useColorScheme()` in the ThemeProvider only. Other components and design-system primitives should consume the resolved shared scheme; guard `Appearance.setColorScheme` from web.
