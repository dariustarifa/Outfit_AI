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
  overrides it. Static Expo root and splash background colors are omitted so
  runtime appearance is controlled by the resolved theme and `expo-system-ui`.
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
  and dark `placeholder` is `#8993A1`; hue is preserved. Gold-on-background is
  informational only.
- The background crossfade was removed. Its gradient and ambient blobs now
  receive the resolved `bgTop`, `bgBottom`, `blobA`, and `blobB` colors from the
  root ThemeProvider.

## Dark mode diagnosis

The YES/NO answers below describe the state before Patch I.

1. **YES.** `ThemeProvider` wrapped the application shell, including the
   gesture root, gradient, Stack, and route-level tab bar. This was not the
   cause.
2. **YES.** `app.json` had static root and splash background colors. The
   gesture-root color was theme-driven but used the top gradient color, and the
   native system window had no runtime theme update. Removed the static Expo
   background properties, changed the gesture root to `bgBottom`, and update
   `SystemUI` when `scheme` changes.
3. **NO.** Module-level styles contain no theme palette values. A few
   scheme-neutral `transparent` surfaces remain, but they do not need to be
   recomputed and did not cause the mismatch.
4. **NO.** No app file imported the old static palette exports. The unused
   `lightColors` and `darkColors` exports were removed from the app theme barrel.
5. **NO.** Before this patch, `GradientBackground` used the design-system
   `useColors()` external-store hook instead of the app `useTheme()` context.
   That hook subscribes correctly, but the split source made the root less
   explicit. The root now passes the resolved `useTheme().colors` palette in.
6. **YES.** Theme mode was already persisted, loaded before screens, and memoized
   with mode and scheme dependencies. The memoized value now also carries the
   system scheme used by the debug badge.
7. **NO.** The color-dependent wardrobe renderer included its color tokens in
   the dependency list; no stale color closures were found.

The practical mismatch was the fixed Expo/system-window background behind the
gradient plus the old warm-charcoal dark palette. The runtime root now follows
the theme and the dark gradient uses the requested blue-gray palette.
