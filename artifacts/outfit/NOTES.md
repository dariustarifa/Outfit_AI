# Setup notes

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
