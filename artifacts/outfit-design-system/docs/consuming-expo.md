# Consuming Outfit Design System in Expo apps

Read `artifacts/outfit-design-system/docs/AGENTS.md` and
`artifacts/outfit-design-system/SKILL.md` first. React Native does not consume
the web CSS or DOM components; it imports the portable tokens directly. If the
Expo app still contains scaffolded or existing local theme/hooks/components,
also read `artifacts/outfit-design-system/docs/migrating-expo.md` before writing
UI.

## Native theme and fonts

Import the native theme and color hook directly from the package. A local
`src/theme.ts` may re-export them as a convenience, but must not duplicate or
redefine their values:

```tsx
export { nativeTheme as theme } from "@workspace/outfit-design-system/lib/native-theme";
export { useColors } from "@workspace/outfit-design-system/hooks/use-colors";
```

Use `useColors()` for the active light/dark palette. `nativeTheme` also exports
the source-derived spacing, screen padding, card and pill radii, glass layers,
and button dimensions. Do not hardcode duplicate hex values in the consuming app.

The font source files are retained in
`artifacts/outfit-design-system/docs/references/fonts/`. Copy the required files
to the Expo app's `assets/fonts/` because Metro may not watch sibling artifacts.
Load Satoshi Regular, Medium, Bold and Melodrama Medium with `expo-font`; gate
rendering on the loaded/error result. Use Satoshi for all interface text and
reserve Melodrama Medium for large headlines.

## Native components

Import the shared mobile primitives directly:

```tsx
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import {
  setGlassEffectLevel,
  useGlassEffectLevel,
} from "@workspace/outfit-design-system/hooks/use-glass-effect";
```

Keep product data, navigation, and screen composition in Expo. Metro resolves
the workspace package through pnpm symlinks. Do not copy source or token values.
Loose binary assets may still need copying into Expo because Metro does not
watch sibling artifact folders by default.

`useGlassEffectLevel()` reads the shared Liquid-to-Frosted intensity. Use
`setGlassEffectLevel(value)` to update all native glass surfaces; persist the
consumer's selected value in its own app storage.

## Dependencies and assets

Metro resolves the workspace package through pnpm symlinks. Do not copy source
or token values. Loose binary assets may still need copying into Expo because
Metro does not watch sibling artifact folders by default.

Set `app.json`'s literal `splash.backgroundColor` from
`tokens.color.light.background` and keep it synchronized when that token changes.

## Resolve the color scheme once

The consuming app's ThemeProvider is the only place that reads
`useColorScheme()`. It resolves the saved `light`, `dark`, or `system` mode and
calls `setColorSchemeOverride()` with the resulting `light` or `dark` scheme
before rendering screens. For native appearance, pass `null` to
`Appearance.setColorScheme()` only when the saved mode is `system`; guard that
call from web. `GlassView` and `GradientBackground` consume the shared resolved
scheme and never read system appearance on their own.

## Verify

Render `GradientBackground` and `GlassView` from the package, then run Expo
typecheck and the development workflow before building the wider screen flow.
