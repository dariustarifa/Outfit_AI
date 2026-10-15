/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#F5F2EB",
      "foreground": "#2B2B2E",
      "border": "#DDD3C7",
      "card": "#F5F2EB",
      "cardForeground": "#2B2B2E",
      "popover": "#F5F2EB",
      "popoverForeground": "#2B2B2E",
      "primary": "#2B2B2E",
      "primaryForeground": "#F5F2EB",
      "secondary": "#DDD3C7",
      "secondaryForeground": "#2B2B2E",
      "muted": "#E6D2B8",
      "mutedForeground": "#6B665F",
      "accent": "#D8BC8C",
      "accentForeground": "#2B2B2E",
      "destructive": "#A33A3A",
      "destructiveForeground": "#F5F2EB",
      "input": "#DDD3C7",
      "ring": "#9A7B4F",
      "chart1": "#9A7B4F",
      "chart2": "#C9D3C1",
      "chart3": "#E6D2B8",
      "chart4": "#D8BC8C",
      "chart5": "#6B665F",
      "sidebar": "#F5F2EB",
      "sidebarForeground": "#2B2B2E",
      "sidebarBorder": "#DDD3C7",
      "sidebarPrimary": "#2B2B2E",
      "sidebarPrimaryForeground": "#F5F2EB",
      "sidebarAccent": "#E6D2B8",
      "sidebarAccentForeground": "#2B2B2E",
      "sidebarRing": "#9A7B4F"
    },
    "dark": {
      "background": "#2B2B2E",
      "foreground": "#F5F2EB",
      "border": "#6B665F",
      "card": "#6B665F",
      "cardForeground": "#F5F2EB",
      "popover": "#6B665F",
      "popoverForeground": "#F5F2EB",
      "primary": "#F5F2EB",
      "primaryForeground": "#2B2B2E",
      "secondary": "#6B665F",
      "secondaryForeground": "#F5F2EB",
      "muted": "#6B665F",
      "mutedForeground": "#DDD3C7",
      "accent": "#D8BC8C",
      "accentForeground": "#2B2B2E",
      "destructive": "#E07B7B",
      "destructiveForeground": "#F5F2EB",
      "input": "#6B665F",
      "ring": "#D8BC8C",
      "chart1": "#D8BC8C",
      "chart2": "#C9D3C1",
      "chart3": "#E6D2B8",
      "chart4": "#DDD3C7",
      "chart5": "#9A7B4F",
      "sidebar": "#2B2B2E",
      "sidebarForeground": "#F5F2EB",
      "sidebarBorder": "#6B665F",
      "sidebarPrimary": "#D8BC8C",
      "sidebarPrimaryForeground": "#2B2B2E",
      "sidebarAccent": "#6B665F",
      "sidebarAccentForeground": "#F5F2EB",
      "sidebarRing": "#D8BC8C"
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
