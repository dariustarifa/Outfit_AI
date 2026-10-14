# Migrating Expo UI to Outfit Design System

Read `artifacts/outfit-design-system/docs/AGENTS.md` and
`artifacts/outfit-design-system/docs/consuming-expo.md` first. Use this guide
when an Expo app, including a fresh scaffold, has local theme, hooks, fonts, or
product-agnostic component implementations.

## Rewrite theme and font imports

Grep the Expo artifact for `@/constants/colors`, `@/hooks/useColors`, local
`useFonts` calls, and direct font imports. Read every matching scaffold and app
file before deleting anything.

- Rewrite color/theme imports to
  `@workspace/outfit-design-system/lib/native-theme` and
  `@workspace/outfit-design-system/hooks/use-colors`.
- Keep font loading in the Expo app because the OTF files must be bundled from
  its own `assets/fonts/` directory. Replace scaffold fonts with the required
  Outfit fonts and preserve SplashScreen gating.
- Delete app-local `constants/colors.ts` and `hooks/useColors.ts` after every
  import points at this package. Do not leave compatibility re-exports.
- Remove local palette interfaces, token mappings, and color-scheme logic now
  supplied by this package. Keep only the app-local font registration that loads
  files from its own assets directory.

## Replace product-agnostic UI

Inventory inline and app-local styled controls before migrating screens.

- Replace local `GradientBackground` and `GlassView` implementations with the
  package native components. Add more shared native families only when this
  project needs them.
- Keep domain-specific compositions local, but rewrite their internals to
  compose package primitives.
- Delete app-local product-agnostic components after all imports are rewritten.
- Do not import web `components/ui/*`, `styles.css`, or DOM/Tailwind code into
  React Native.

## Clean dependencies and verify

- Keep the design-system workspace package and its native peer dependencies in
  Expo `dependencies`.
- Remove dependencies used only by deleted local implementations.
- Confirm `constants/colors.ts` and `hooks/useColors.ts` are gone.
- Grep for the old local import paths and resolve every hit.
- Run Expo typecheck and the development workflow; verify the native theme,
  fonts, and one package primitive before presenting the app.

Migration is complete when Expo imports the native theme, color hook, and shared
background/glass primitives directly from `@workspace/outfit-design-system`,
and retains only product-specific state and UI compositions locally.
