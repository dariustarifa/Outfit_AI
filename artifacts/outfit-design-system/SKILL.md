# Outfit visual system

Outfit is a Spanish-language personal styling app. It helps people choose a look
from their own wardrobe, taking their plans and local weather into account. The
experience should feel personal, calm, and editorial rather than like a generic
shopping catalog.

## Source notes

- The linked Figma file provides a single mobile home-screen composition; it has
  no reusable published component catalog or variable definitions available.
- The exact base colors and interaction rules below come from the Outfit project
  brief. The light theme preserves those values. The dark theme in `tokens.json`
  is derived from the same palette.
- The uploaded mirror-and-sparkle icon is the supplied brand mark. Keep it as an
  image; do not redraw or alter it.

## Language and type

- All text shown in the app is Spanish. Preserve quoted interface copy from the
  product brief exactly.
- Use Satoshi for interface and body text: Regular 400, Medium 500, Bold 700.
- Use Melodrama Medium 500 only for large headlines. Do not use Melodrama for
  body text, labels, or controls.
- The Outfit design system package embeds Satoshi Regular, Medium, Bold and
  Melodrama Medium for web. The font sources are retained in
  `docs/references/fonts/` for native apps.

## Color and background

- Light background: vertical gradient from `#F5F2EB` to `#DDD3C7`.
- Text: `#2B2B2E` primary and `#6B665F` secondary.
- Accent: `#9A7B4F`. Ambient blobs: sand `#E6D2B8`, gold `#D8BC8C`, and sage
  `#C9D3C1`.
- In the native app, place three soft radial color blobs in the lower half:
  approximately 320 pt, 60% center opacity fading to transparent at the edge.
  Use sand at the lower left, gold at the lower right, and sage at mid-right.
- Keep backgrounds warm and atmospheric. Do not replace the gradient and color
  blobs with a flat white surface.

## Glass surfaces

Use clear, low-to-medium-opacity glass so the background remains visible:

1. Native blur uses `expo-blur` at intensity 45 with a light tint.
2. Overlay a white gradient from 32% opacity at the top-left to 6% at the
   bottom-right.
3. Use a 1 px border in `rgba(255,255,255,0.70)`.
4. Use a black shadow at 8% opacity, radius 24, and vertical offset 8.
5. Clip the content to the supplied border radius. If native blur is unavailable
   on Android, use `rgba(255,255,255,0.35)` as the background.

Glass is neither frosted nor matte and must not become an opaque white card.
Keep the colored background behind it; the translucency depends on that color.

## Controls and layout

- Primary buttons are charcoal `#2B2B2E` pills with `#F5F2EB` text, height 56.
  Disabled buttons use 40% opacity.
- Use 24 px card corners and 999 px pill corners.
- Use 24 px horizontal screen padding and the 4 px base spacing step.
- Add a gentle scale-to-0.97 response while a button is pressed.

## Motion and feedback

- Springs: damping 20, stiffness 220, mass 1.
- Fades: 250 ms. Screens enter with a fade and 12 pt upward movement.
- Avoid abrupt jumps between states.
- Native haptic patterns are light tap, selection, and success. Protect every
  haptic call with `try/catch`.

## Component scope

The source provides foundations and a single screen composition, not a reusable
Figma component library. The web component browser therefore keeps the scaffold's
general-purpose component families, themed with Outfit's tokens. Keep app-specific
data, navigation, and screen composition in the consuming app.
