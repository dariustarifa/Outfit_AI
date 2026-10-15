# Outfit visual system

Outfit is a Spanish-language personal styling app. It helps people choose a look
from their own wardrobe, taking their plans and local weather into account. The
experience should feel personal, calm, and editorial rather than like a generic
shopping catalog.

## Source notes

- The linked Figma file provides a single mobile home-screen composition; it has
  no reusable published component catalog or variable definitions available.
- The exact base colors and interaction rules below come from the Outfit project
  brief. The light theme preserves those values. The dark theme uses a
  blue-gray gradient with muted blue ambient colors and antique-gold accents.
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

- Light background: vertical gradient from `#F4F1EA` to `#D3CCC5`.
- Dark background: vertical gradient from `#222831` to `#11151B`, with ambient
  blue-gray colors `#33445A` and `#3D4F6B`.
- Light text: `#2E2D30` primary and `#5B5753` secondary; light accent:
  `#B19B63`. Light ambient blobs use sand `#E5D8C8` and gold `#D6C39C`.
- Dark text: `#EDF0F5` primary and `#A9B1BD` secondary; dark accent:
  `#D4BC86`.
- In the native app, place three soft radial color blobs in the lower half:
  approximately 320 pt, 80% center opacity fading to transparent at the edge.
  Reuse the two theme ambient colors at lower left, lower right, and mid-right.
- Keep backgrounds warm and atmospheric. Do not replace the gradient and color
  blobs with a flat white surface.

## Glass surfaces

Keep glass adjustable from a clear, liquid treatment to a softly frosted one.
The default remains clear and low-opacity so the warm background stays visible:

1. On iOS 26+ when `isLiquidGlassAvailable()` is true, use native `clear` for
   the clear preset and `regular` for medium. Matte always uses the fallback.
2. Elsewhere, choose a named `expo-blur` preset: clear (14), medium (40), or
   matte (80), with light/dark white-gradient alpha values from
   `nativeEffects.glass.levels`.
3. Clip glass content to the supplied border radius. Keep the scheme-aware
   outer dark edge and inner light edge on separate overlays.
4. Keep shadows outside the clipped glass. Reserve the subtle scheme-aware
   shadow for elevated controls such as the tab bar.

Keep the warm background visible behind glass, especially in dark mode. Never
animate the opacity of native glass. Hide it by moving it with `translateY`.

## Controls and layout

- The home tab bar and plan pill share a width of screen width minus 40 pt and
  a height of 64 pt. The plan pill sits 12 pt above the bar.
- The active tab highlight is a 92 × 48 pt plain oval with a 999 pt radius and
  slides between Home and Profile; the add button does not receive the highlight.
- Primary buttons use the theme's primary/on-primary pair and are 56 pt high.
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
