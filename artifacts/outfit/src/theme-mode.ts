export type ThemeMode = "light" | "dark" | "system";
export type GlassLevel = "clear" | "medium" | "matte";

export const THEME_MODE_KEY = "themeMode";
export const GLASS_LEVEL_KEY = "glassLevel";
export const DEFAULT_GLASS_LEVEL: GlassLevel = "clear";

export interface ThemeModeStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function colorSchemeForMode(
  mode: ThemeMode,
): "light" | "dark" | null {
  return mode === "system" ? null : mode;
}

export function resolveColorScheme(
  mode: ThemeMode,
  systemScheme: "light" | "dark" | null,
): "light" | "dark" {
  return mode === "system" ? systemScheme ?? "light" : mode;
}

export async function loadThemeMode(
  storage: Pick<ThemeModeStorage, "getItem">,
): Promise<ThemeMode> {
  const savedMode = await storage.getItem(THEME_MODE_KEY);
  return isThemeMode(savedMode) ? savedMode : "system";
}

export async function persistThemeMode(
  storage: Pick<ThemeModeStorage, "setItem">,
  mode: ThemeMode,
): Promise<void> {
  await storage.setItem(THEME_MODE_KEY, mode);
}

export function isGlassLevel(value: string | null): value is GlassLevel {
  return value === "clear" || value === "medium" || value === "matte";
}

export async function loadGlassLevel(
  storage: Pick<ThemeModeStorage, "getItem">,
): Promise<GlassLevel> {
  const savedLevel = await storage.getItem(GLASS_LEVEL_KEY);
  return isGlassLevel(savedLevel) ? savedLevel : DEFAULT_GLASS_LEVEL;
}

export async function persistGlassLevel(
  storage: Pick<ThemeModeStorage, "setItem">,
  level: GlassLevel,
): Promise<void> {
  await storage.setItem(GLASS_LEVEL_KEY, level);
}
