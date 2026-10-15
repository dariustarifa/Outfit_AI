# Project notes

## Initial setup notes (historical)

The following bullets describe the initial scaffold, not the current app:

- This phase contains only the Expo project foundation and the temporary
  `Setup OK` glass check. Onboarding, the home screen, profile editing, and
  wardrobe screens are intentionally not implemented yet.
- The required temporary text is `Setup OK` exactly, despite the app's Spanish
  language rule. Other app-facing copy added in this phase is Spanish.
- The root route remains on the setup check until the onboarding and home routes
  arrive in a later phase; the requested profile-based route selection is not
  connected before those screens exist.
- The app imports its palette, color hook, gradient background, and glass
  primitive from `@workspace/outfit-design-system`. `src/theme.ts` only
  re-exports that package's API.
- Local photos are copied into the app document directory before their saved
  URI is persisted. There are no remote services or sign-in flows.

## Theme audit

- `app.json` declares `userInterfaceStyle: "automatic"`; no `app.config.*` file
  overrides it. The static splash background remains the light startup color
  (`#F4F1EA`) because Expo config cannot consume the runtime theme provider.
- The app had no screen-level imports of the light or dark palette. Theme mode
  and system appearance are now resolved in `src/theme/ThemeProvider.tsx`;
  `useColorScheme()` is read there only. The design-system color hook consumes
  the resolved shared override instead of independently reading the OS scheme.
- `Appearance.setColorScheme()` is called only by the provider on native
  platforms: `null` for `system`, and the chosen scheme for fixed modes.
  `app/_layout.tsx` keeps both status-bar implementations explicit from
  `isDark`.
- The initial audit found fixed scrim colors in `components/ErrorFallback.tsx`,
  `src/components/HomeControls.tsx`, and `src/components/BottomSheet.tsx`.
  Those three runtime colors now use the semantic `backdrop` token; no
  hard-coded color literals remain in app screen/component source. Camera-only
  dark surfaces and white foregrounds are centralized in the design-system
  native theme.
- `artifacts/outfit/server/templates/landing-page.html` is a separate
  server fallback page and retains its own static styling; it is not part of
  the Outfit mobile UI.
- Development startup checks both palettes against the required WCAG ratios.
  To pass, light `textMuted` is `#5B5753`, light `placeholder` is `#6B6761`,
  and dark `placeholder` is `#969189`; hue is preserved. Gold-on-background is
  informational only.
- The background crossfade was removed. Its gradient and ambient blobs now
  consume the shared `bgTop`, `bgBottom`, `blobA`, and `blobB` tokens directly.
