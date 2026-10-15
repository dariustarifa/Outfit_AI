/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens. Alpha colors preserve their source values. Web consumes the theme via
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
      "sidebarRing": "#B19B63",
      "edgeShade": "rgba(0,0,0,0.10)"
    },
    "dark": {
      "background": "#B2B2B2",
      "foreground": "#242530",
      "border": "#555779",
      "card": "#B8B8B8",
      "cardForeground": "#242530",
      "popover": "#BEBEBE",
      "popoverForeground": "#242530",
      "primary": "#555779",
      "primaryForeground": "#F4F4F4",
      "secondary": "#A0A0A0",
      "secondaryForeground": "#242530",
      "muted": "#A6A6AA",
      "mutedForeground": "#34364B",
      "accent": "#D4BC86",
      "accentForeground": "#151A21",
      "destructive": "#74272B",
      "destructiveForeground": "#F4F4F4",
      "input": "#BEBEBE",
      "ring": "#555779",
      "chart1": "#5F4D28",
      "chart2": "#9D9DAA",
      "chart3": "#C2C2C2",
      "chart4": "#C7B98F",
      "chart5": "#555779",
      "sidebar": "#A8A8A8",
      "sidebarForeground": "#242530",
      "sidebarBorder": "#555779",
      "sidebarPrimary": "#555779",
      "sidebarPrimaryForeground": "#F4F4F4",
      "sidebarAccent": "#9A9AA3",
      "sidebarAccentForeground": "#242530",
      "sidebarRing": "#555779",
      "edgeShade": "rgba(0,0,0,0.14)"
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
