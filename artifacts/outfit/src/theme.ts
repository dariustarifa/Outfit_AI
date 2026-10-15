import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import {
  nativeEffects,
  nativeLayout,
  nativeTheme,
} from "@workspace/outfit-design-system/lib/native-theme";
import { setColorSchemeOverride } from "@workspace/outfit-design-system/hooks/use-colors";
import {
  colorSchemeForMode,
  loadThemeMode,
  persistThemeMode,
  type ThemeMode,
} from "./theme-mode";

export type { ThemeMode } from "./theme-mode";
export { nativeEffects, nativeLayout };
export const lightColors = nativeTheme.light;
export const darkColors = nativeTheme.dark;
export type ThemeColors = typeof lightColors | typeof darkColors;
const ThemeContext = createContext<{
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
} | null>(null);

function applyAppearanceMode(mode: ThemeMode) {
  const scheme = colorSchemeForMode(mode);
  setColorSchemeOverride(scheme);
  if (Platform.OS !== "web" && typeof Appearance.setColorScheme === "function") {
    // React Native supports null at runtime, though the installed type omits it.
    Appearance.setColorScheme(scheme as never);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadThemeMode(AsyncStorage)
      .then((initialMode) => {
        applyAppearanceMode(initialMode);
        if (active) {
          setModeState(initialMode);
          setReady(true);
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to load the saved appearance mode.", error);
        applyAppearanceMode("system");
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const isDark =
    mode === "dark" || (mode === "system" && systemColorScheme === "dark");
  const colors = isDark ? darkColors : lightColors;

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    const previousMode = mode;
    setModeState(nextMode);
    applyAppearanceMode(nextMode);
    try {
    await persistThemeMode(AsyncStorage, nextMode);
    } catch (error) {
      setModeState(previousMode);
      applyAppearanceMode(previousMode);
      throw error;
    }
  }, [mode]);

  const value = useMemo(
    () => ({ colors, isDark, mode, setMode }),
    [colors, isDark, mode, setMode],
  );

  if (!ready) return null;
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return theme;
}

export const BAR_HEIGHT = 64;
export const BAR_WIDTH = (screenWidth: number) => screenWidth - 40;

export const radius = {
  control: 28,
  panel: 32,
  field: 20,
  thumb: 14,
} as const;
