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
      "mutedForeground": "#6E6A65",
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
      "chart5": "#6E6A65",
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
      "background": "#201E1C",
      "foreground": "#F4F1EA",
      "border": "#55463A",
      "card": "#232120",
      "cardForeground": "#F4F1EA",
      "popover": "#232120",
      "popoverForeground": "#F4F1EA",
      "primary": "#F4F1EA",
      "primaryForeground": "#201E1C",
      "secondary": "#161310",
      "secondaryForeground": "#F4F1EA",
      "muted": "#55463A",
      "mutedForeground": "#A8A29A",
      "accent": "#6A5530",
      "accentForeground": "#F4F1EA",
      "destructive": "#E57373",
      "destructiveForeground": "#201E1C",
      "input": "#201E1C",
      "ring": "#C9B27A",
      "chart1": "#C9B27A",
      "chart2": "#55463A",
      "chart3": "#55463A",
      "chart4": "#6A5530",
      "chart5": "#A8A29A",
      "sidebar": "#201E1C",
      "sidebarForeground": "#F4F1EA",
      "sidebarBorder": "#55463A",
      "sidebarPrimary": "#C9B27A",
      "sidebarPrimaryForeground": "#201E1C",
      "sidebarAccent": "#55463A",
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
