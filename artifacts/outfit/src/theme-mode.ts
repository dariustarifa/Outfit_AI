export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODE_KEY = "themeMode";

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
