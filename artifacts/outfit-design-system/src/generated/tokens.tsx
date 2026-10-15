/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#F4F1EA",
      "foreground": "#2E2D30",
      "border": "#DDD3C7",
      "card": "#F4F1EA",
      "cardForeground": "#2E2D30",
      "popover": "#F4F1EA",
      "popoverForeground": "#2E2D30",
      "primary": "#2E2D30",
      "primaryForeground": "#F4F1EA",
      "secondary": "#D3CCC5",
      "secondaryForeground": "#2E2D30",
      "muted": "#E5D8C8",
      "mutedForeground": "#5B5753",
      "accent": "#D6C39C",
      "accentForeground": "#2E2D30",
      "destructive": "#A33A3A",
      "destructiveForeground": "#F4F1EA",
      "input": "#F4F1EA",
      "ring": "#B19B63",
      "chart1": "#B19B63",
      "chart2": "#C9D3C1",
      "chart3": "#E5D8C8",
      "chart4": "#D6C39C",
      "chart5": "#5B5753",
      "sidebar": "#F4F1EA",
      "sidebarForeground": "#2E2D30",
      "sidebarBorder": "#DDD3C7",
      "sidebarPrimary": "#2E2D30",
      "sidebarPrimaryForeground": "#F4F1EA",
      "sidebarAccent": "#E5D8C8",
      "sidebarAccentForeground": "#2E2D30",
      "sidebarRing": "#B19B63"
    },
    "dark": {
      "background": "#2B2826",
      "foreground": "#F4F1EA",
      "border": "#4A3D31",
      "card": "#2B2826",
      "cardForeground": "#F4F1EA",
      "popover": "#2B2826",
      "popoverForeground": "#F4F1EA",
      "primary": "#F4F1EA",
      "primaryForeground": "#1E1C1A",
      "secondary": "#1B1917",
      "secondaryForeground": "#F4F1EA",
      "muted": "#4A3D31",
      "mutedForeground": "#B3ADA4",
      "accent": "#D4BC86",
      "accentForeground": "#1E1C1A",
      "destructive": "#E57373",
      "destructiveForeground": "#1E1C1A",
      "input": "#2B2826",
      "ring": "#D4BC86",
      "chart1": "#D4BC86",
      "chart2": "#4A3D31",
      "chart3": "#4A3D31",
      "chart4": "#5E4B2C",
      "chart5": "#B3ADA4",
      "sidebar": "#2B2826",
      "sidebarForeground": "#F4F1EA",
      "sidebarBorder": "#4A3D31",
      "sidebarPrimary": "#D4BC86",
      "sidebarPrimaryForeground": "#1E1C1A",
      "sidebarAccent": "#4A3D31",
      "sidebarAccentForeground": "#F4F1EA",
      "sidebarRing": "#C9B27A"
    }
  },
  "fontFamily": {
    "sans": [
      "Satoshi",
      "sans-serif"
    ],
    "serif": [
      "Melodrama",
      "serif"
    ],
    "mono": [
      "Satoshi",
      "monospace"
    ]
  },
  "radius": "1.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
