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
    bgTop: palette.background,
    bgBottom: palette.secondary,
    text: palette.foreground,
    textMuted: palette.mutedForeground,
    backgroundTop: palette.background,
    backgroundBottom: palette.secondary,
    textPrimary: palette.foreground,
    textSecondary: palette.mutedForeground,
    gold: palette.chart1,
    iconInactive: palette.mutedForeground,
    blobA: palette.chart3,
    blobB: palette.chart4,
    blobSand: palette.chart3,
    blobGold: palette.chart4,
    blobSage: palette.chart2,
    glassBorder:
      mode === "dark"
        ? "rgba(255,255,255,0.22)"
        : "rgba(255,255,255,0.75)",
    edgeShade: palette.edgeShade,
    fieldBg:
      mode === "dark"
        ? "rgba(255,255,255,0.07)"
        : "rgba(255,255,255,0.5)",
    fieldBorder:
      mode === "dark"
        ? "rgba(255,255,255,0.16)"
        : "rgba(255,255,255,0.7)",
    placeholder: mode === "dark" ? "#8993A1" : "#6B6761",
    danger: palette.destructive,
    primaryBg: palette.primary,
    onPrimary: palette.primaryForeground,
    onGold: mode === "dark" ? "#151A21" : palette.foreground,
    onChip: palette.foreground,
    chipBg:
      mode === "dark"
        ? "rgba(255,255,255,0.14)"
        : palette.background,
    chipBorder:
      mode === "dark"
        ? "rgba(255,255,255,0.26)"
        : "rgba(255,255,255,0.75)",
    backdrop:
      mode === "dark"
        ? "rgba(0,0,0,0.5)"
        : "rgba(0,0,0,0.12)",
    cameraBackground: "#000000",
    cameraForeground: "#FFFFFF",
    cameraActionBg: "#FFFFFF",
    cameraActionText: mode === "dark" ? "#151A21" : "#1E1C1A",
    cameraGlassBorder: "rgba(255,255,255,0.22)",
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
    defaultLevel: "clear" as const,
    levels: {
      clear: {
        light: {
          blurIntensity: 14,
          gradientStart: "rgba(255,255,255,0.18)",
          gradientEnd: "rgba(255,255,255,0.03)",
        },
        dark: {
          blurIntensity: 14,
          gradientStart: "rgba(255,255,255,0.10)",
          gradientEnd: "rgba(255,255,255,0.02)",
        },
      },
      medium: {
        light: {
          blurIntensity: 40,
          gradientStart: "rgba(255,255,255,0.38)",
          gradientEnd: "rgba(255,255,255,0.12)",
        },
        dark: {
          blurIntensity: 40,
          gradientStart: "rgba(255,255,255,0.20)",
          gradientEnd: "rgba(255,255,255,0.07)",
        },
      },
      matte: {
        light: {
          blurIntensity: 80,
          gradientStart: "rgba(255,255,255,0.66)",
          gradientEnd: "rgba(255,255,255,0.46)",
        },
        dark: {
          blurIntensity: 80,
          gradientStart: "rgba(255,255,255,0.34)",
          gradientEnd: "rgba(255,255,255,0.20)",
        },
      },
    },
    shadows: {
      light: {
        color: "#000000",
        opacity: 0.14,
        radius: 16,
        offsetY: 6,
        elevation: 6,
      },
      dark: {
        color: "#000000",
        opacity: 0.45,
        radius: 18,
        offsetY: 8,
        elevation: 8,
      },
    },
    transitionDurationSeconds: 0.24,
  },
  ambient: {
    diameter: 320,
    centerOpacity: 0.8,
  },
} as const;

export type OutfitNativeTheme = typeof nativeTheme;
export type OutfitNativeColors = typeof nativeTheme.light;
