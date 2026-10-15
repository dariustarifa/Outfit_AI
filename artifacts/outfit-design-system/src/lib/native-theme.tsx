import { tokens } from "../generated/tokens";

function toPoints(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    throw new Error(`Unsupported design-system dimension: ${value}`);
  }

  if (value.endsWith("rem")) return amount * 16;
  if (value.endsWith("px")) return amount;
  throw new Error(`Unsupported design-system dimension unit: ${value}`);
}

function extendPalette<T extends Record<string, string>>(
  palette: T,
  mode: "light" | "dark",
) {
  return {
    ...palette,
    backgroundTop: palette.background,
    backgroundBottom: palette.secondary,
    textPrimary: palette.foreground,
    textSecondary: palette.mutedForeground,
    gold: palette.chart1,
    iconInactive: palette.mutedForeground,
    blobSand: palette.chart3,
    blobGold: palette.chart4,
    blobSage: palette.chart2,
    glassBorder:
      mode === "dark"
        ? "rgba(255,255,255,0.22)"
        : "rgba(255,255,255,0.75)",
    fieldBg:
      mode === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(255,255,255,0.5)",
    fieldBorder:
      mode === "dark"
        ? "rgba(255,255,255,0.18)"
        : "rgba(255,255,255,0.7)",
    danger: palette.destructive,
    chipBg:
      mode === "dark"
        ? "rgba(255,255,255,0.18)"
        : palette.background,
    chipBorder:
      mode === "dark"
        ? "rgba(255,255,255,0.28)"
        : "rgba(255,255,255,0.75)",
    cameraBackground: "#000000",
  };
}

export const nativeTheme = {
  light: extendPalette(tokens.color.light, "light"),
  dark: extendPalette(tokens.color.dark, "dark"),
} as const;

export const nativeLayout = {
  baseSpacing: toPoints(tokens.spacing),
  screenHorizontalPadding: toPoints(tokens.spacing) * 6,
  cardRadius: toPoints(tokens.radius),
  pillRadius: 999,
  primaryButtonHeight: 56,
} as const;

export const nativeEffects = {
  glass: {
    blurIntensity: 14,
    gradientStart: "rgba(255,255,255,0.18)",
    gradientEnd: "rgba(255,255,255,0.03)",
    highlightStart: "rgba(255,255,255,0.9)",
    highlightEnd: "rgba(255,255,255,0)",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffsetY: 6,
  },
  ambient: {
    diameter: 320,
    centerOpacity: 0.8,
  },
} as const;

export type OutfitNativeTheme = typeof nativeTheme;
export type OutfitNativeColors = typeof nativeTheme.light;
