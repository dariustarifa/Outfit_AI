import type { ThemeColors } from "./ThemeProvider";

type ContrastPalette = Pick<
  ThemeColors,
  | "bgTop"
  | "bgBottom"
  | "text"
  | "textMuted"
  | "gold"
  | "iconInactive"
  | "chipBg"
  | "onChip"
  | "primaryBg"
  | "onPrimary"
  | "onGold"
  | "fieldBg"
  | "placeholder"
  | "danger"
>;

type RGB = readonly [number, number, number];
type ContrastLogger = Pick<Console, "log" | "warn">;

function parseColor(color: string): { rgb: RGB; alpha: number } {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const expanded =
      hex.length === 3 ? hex.split("").map((digit) => digit + digit).join("") : hex;
    if (expanded.length !== 6) {
      throw new Error(`Unsupported contrast color: ${color}`);
    }
    return {
      rgb: [
        Number.parseInt(expanded.slice(0, 2), 16),
        Number.parseInt(expanded.slice(2, 4), 16),
        Number.parseInt(expanded.slice(4, 6), 16),
      ],
      alpha: 1,
    };
  }

  const match = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (!match) {
    throw new Error(`Unsupported contrast color: ${color}`);
  }
  return {
    rgb: [Number(match[1]), Number(match[2]), Number(match[3])],
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function compositeOver(background: string, base: string): RGB {
  const foregroundColor = parseColor(background);
  const baseColor = parseColor(base);
  return foregroundColor.rgb.map((channel, index) =>
    Math.round(
      channel * foregroundColor.alpha +
        baseColor.rgb[index] * (1 - foregroundColor.alpha),
    ),
  ) as unknown as RGB;
}

function luminance(color: RGB): number {
  const channels = color.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function colorOnSurface(color: string, bgBottom: string): RGB {
  const parsed = parseColor(color);
  return parsed.alpha < 1 ? compositeOver(color, bgBottom) : parsed.rgb;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = luminance(parseColor(foreground).rgb);
  const second = luminance(parseColor(background).rgb);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function logContrastAudit(
  palettes: { light: ContrastPalette; dark: ContrastPalette },
  logger: ContrastLogger = console,
) {
  const requiredPairs = [
    ["text", "bgTop", 4.5],
    ["text", "bgBottom", 4.5],
    ["textMuted", "bgTop", 4.5],
    ["textMuted", "bgBottom", 4.5],
    ["onChip", "chipBg", 4.5],
    ["onPrimary", "primaryBg", 4.5],
    ["onGold", "gold", 4.5],
    ["text", "fieldBg", 4.5],
    ["placeholder", "fieldBg", 4.5],
    ["iconInactive", "bgBottom", 3],
    ["danger", "bgBottom", 3],
  ] as const;

  for (const [paletteName, palette] of Object.entries(palettes) as [
    "light" | "dark",
    ContrastPalette,
  ][]) {
    logger.log(`[contrast] ${paletteName} palette`);
    for (const [foregroundKey, backgroundKey, minimum] of requiredPairs) {
      const background = colorOnSurface(
        palette[backgroundKey],
        palette.bgBottom,
      );
      const ratio = contrastRatio(palette[foregroundKey], rgbToHex(background));
      const message =
        `${foregroundKey} on ${backgroundKey}: ${ratio.toFixed(2)}:1 ` +
        `(minimum ${minimum}:1)`;
      if (ratio < minimum) {
        logger.warn(`[contrast] FAIL ${paletteName}: ${message}`);
      } else {
        logger.log(`[contrast] PASS ${paletteName}: ${message}`);
      }
    }

    const goldContrast = contrastRatio(
      palette.gold,
      rgbToHex(colorOnSurface(palette.bgBottom, palette.bgBottom)),
    );
    logger.log(
      `[contrast] INFO ${paletteName}: gold on bgBottom ${goldContrast.toFixed(2)}:1`,
    );
  }
}

function rgbToHex([red, green, blue]: RGB) {
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
