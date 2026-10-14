---
name: Expo font-gated preview
description: How to distinguish a slow local-font gate from an Expo route failure in the Replit web preview.
---

Keep the app's font-load gate intact when an initial Expo web preview appears blank. Replit's screenshot capture can happen before local OTF font loading settles; a delayed browser render may show the app correctly.

**Why:** The initial capture showed a blank frame without a JavaScript exception, while a delayed headless render showed the setup route and registered fonts.

**How to apply:** When a font-gated Expo preview is blank, inspect the font-loading state and verify after allowing assets to load before changing route or splash behavior.
