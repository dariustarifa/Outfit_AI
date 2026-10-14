# Consuming Outfit Design System in Expo apps

Read `artifacts/outfit-design-system/docs/AGENTS.md` and
`artifacts/outfit-design-system/SKILL.md` first. React Native does not consume
the web CSS or DOM components; it imports the portable tokens directly. If the
Expo app still contains scaffolded or existing local theme/hooks/components,
also read `artifacts/outfit-design-system/docs/migrating-expo.md` before writing
UI.

## Native theme and fonts

Import the portable tokens in the Expo app. A local `src/theme.ts` may re-export
them as a convenience, but must not duplicate or redefine their values:

```tsx
import { tokens } from "@workspace/outfit-design-system/tokens";

export const theme = tokens;
```

Use `theme.color.light` and `theme.color.dark` in native styles. Convert the
`radius` and `spacing` strings to React Native numbers at the app boundary.
Do not hardcode duplicate hex values in the consuming app.

The font source files are retained in
`artifacts/outfit-design-system/docs/references/fonts/`. Copy the required files
to the Expo app's `assets/fonts/` because Metro may not watch sibling artifacts.
Load Satoshi Regular, Medium, Bold and Melodrama Medium with `expo-font`; gate
rendering on the loaded/error result. Use Satoshi for all interface text and
reserve Melodrama Medium for large headlines.

## Native components

The current package provides portable tokens and a themed web component
library; it does not ship native React Native components. Keep product data,
navigation, and screen composition in Expo. Implement the app-specific
`GradientBackground` and `GlassView` there from `SKILL.md`. Only move a
product-agnostic native family into this package when more than one consumer
needs it.

## Dependencies and assets

Metro resolves the workspace package through pnpm symlinks. Do not copy source
or token values. Loose binary assets may still need copying into Expo because
Metro does not watch sibling artifact folders by default.

Set `app.json`'s literal `splash.backgroundColor` from
`tokens.color.light.background` and keep it synchronized when that token changes.

## Verify

Import the package tokens and render one native element using a token value;
then run Expo typecheck and the development workflow before building the wider
screen flow.
