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

function extendPalette<T extends Record<string, string>>(palette: T) {
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
  };
}

export const nativeTheme = {
  light: extendPalette(tokens.color.light),
  dark: extendPalette(tokens.color.dark),
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
    blurIntensity: 45,
    tint: "light" as const,
    borderColor: "rgba(255,255,255,0.70)",
    gradientStart: "rgba(255,255,255,0.32)",
    gradientEnd: "rgba(255,255,255,0.06)",
    androidFallback: "rgba(255,255,255,0.35)",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffsetY: 8,
  },
  ambient: {
    diameter: 320,
    centerOpacity: 0.6,
  },
} as const;

export type OutfitNativeTheme = typeof nativeTheme;
export type OutfitNativeColors = typeof nativeTheme.light;
