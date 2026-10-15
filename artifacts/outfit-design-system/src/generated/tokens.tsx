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
      "background": "#222831",
      "foreground": "#EDF0F5",
      "border": "#33445A",
      "card": "#222831",
      "cardForeground": "#EDF0F5",
      "popover": "#222831",
      "popoverForeground": "#EDF0F5",
      "primary": "#EDF0F5",
      "primaryForeground": "#151A21",
      "secondary": "#11151B",
      "secondaryForeground": "#EDF0F5",
      "muted": "#33445A",
      "mutedForeground": "#A9B1BD",
      "accent": "#D4BC86",
      "accentForeground": "#151A21",
      "destructive": "#E57373",
      "destructiveForeground": "#151A21",
      "input": "#222831",
      "ring": "#D4BC86",
      "chart1": "#D4BC86",
      "chart2": "#33445A",
      "chart3": "#33445A",
      "chart4": "#3D4F6B",
      "chart5": "#A9B1BD",
      "sidebar": "#222831",
      "sidebarForeground": "#EDF0F5",
      "sidebarBorder": "#33445A",
      "sidebarPrimary": "#D4BC86",
      "sidebarPrimaryForeground": "#151A21",
      "sidebarAccent": "#33445A",
      "sidebarAccentForeground": "#EDF0F5",
      "sidebarRing": "#D4BC86",
      "edgeShade": "rgba(0,0,0,0.55)"
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
