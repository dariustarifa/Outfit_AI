export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODE_KEY = "themeMode";
export const GLASS_EFFECT_LEVEL_KEY = "glassEffectLevel";

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

export function normalizeStoredGlassEffectLevel(
  value: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

export async function loadGlassEffectLevel(
  storage: Pick<ThemeModeStorage, "getItem">,
  fallback: number,
): Promise<number> {
  const savedLevel = await storage.getItem(GLASS_EFFECT_LEVEL_KEY);
  if (savedLevel === null || savedLevel.trim() === "") return fallback;
  const parsed = Number(savedLevel);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return normalizeStoredGlassEffectLevel(parsed, fallback);
}

export async function persistGlassEffectLevel(
  storage: Pick<ThemeModeStorage, "setItem">,
  level: number,
  fallback: number,
): Promise<void> {
  const normalized = normalizeStoredGlassEffectLevel(level, fallback);
  await storage.setItem(GLASS_EFFECT_LEVEL_KEY, normalized.toString());
}
