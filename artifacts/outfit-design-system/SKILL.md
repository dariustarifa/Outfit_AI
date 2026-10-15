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
  approximately 320 pt, 80% center opacity fading to transparent at the edge.
  Use sand at the lower left, gold at the lower right, and sage at mid-right.
- Keep backgrounds warm and atmospheric. Do not replace the gradient and color
  blobs with a flat white surface.

## Glass surfaces

Keep glass adjustable from a clear, liquid treatment to a softly frosted one.
The default remains clear and low-opacity so the warm background stays visible:

1. On iOS 26+ when `isLiquidGlassAvailable()` is true, use `expo-glass-effect`.
   The clear end uses `clear`; the frosted end may use `regular`. Pass the
   selected light/dark scheme and animate native style changes.
2. Elsewhere, interpolate `expo-blur` intensity and the white gradient between
   the shared liquid and frosted values. The default intensity maps to the
   former 14-point blur.
3. Overlay the interpolated white gradient, then a 1 px token-driven border and
   a 1 px top-edge highlight fading from 90% opacity to transparent.
4. Use a black shadow at 6% opacity, radius 20, and vertical offset 6.
5. Clip fallback content to the supplied border radius. Keep colored blobs
   visible through the low-blur setting; even at the frosted end, do not create
   an opaque white or matte card.

Keep the warm background visible behind glass, especially in dark mode. Never
animate the opacity of native glass. Hide it by moving it with `translateY`.

## Controls and layout

- The home tab bar and plan pill share a width of screen width minus 40 pt and
  a height of 64 pt. The plan pill sits 12 pt above the bar.
- The active tab highlight is a 92 × 48 pt plain oval with a 999 pt radius and
  slides between Home and Profile; the add button does not receive the highlight.
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
general-purpose component families, themed with Outfit's tokens. The native
package provides the brief's reusable gradient and clear-glass primitives. Keep
app-specific data, navigation, and screen composition in the consuming app.
