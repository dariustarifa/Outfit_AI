import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { setGlassEffectLevel as setDesignSystemGlassEffectLevel } from "@workspace/outfit-design-system/hooks/use-glass-effect";
import {
  loadGlassEffectLevel,
  loadThemeMode,
  persistGlassEffectLevel,
  persistThemeMode,
  type ThemeMode,
} from "../theme-mode";
import { logContrastAudit } from "./contrast";

export const lightColors = nativeTheme.light;
export const darkColors = nativeTheme.dark;
export type ThemeColors = typeof lightColors | typeof darkColors;

type ColorScheme = "light" | "dark";
type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ColorScheme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
let contrastAuditHasRun = false;

function resolveScheme(mode: ThemeMode, systemScheme: ColorScheme | null): ColorScheme {
  return mode === "system" ? systemScheme ?? "light" : mode;
}

function setNativeAppearance(mode: ThemeMode) {
  if (Platform.OS !== "web") {
    Appearance.setColorScheme(
      (mode === "system" ? null : mode) as never,
    );
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const normalizedSystemScheme: ColorScheme | null =
    systemScheme === "dark" ? "dark" : systemScheme === "light" ? "light" : null;
  const systemSchemeRef = useRef<ColorScheme | null>(normalizedSystemScheme);
  systemSchemeRef.current = normalizedSystemScheme;
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);
  const scheme = resolveScheme(mode, normalizedSystemScheme);
  const colors = scheme === "dark" ? darkColors : lightColors;

  useEffect(() => {
    let active = true;

    void loadThemeMode(AsyncStorage)
      .catch((error: unknown) => {
        console.error("Unable to load the saved appearance mode.", error);
        return "system" as const;
      })
      .then((initialMode) => {
        const initialScheme = resolveScheme(
          initialMode,
          systemSchemeRef.current,
        );
        setColorSchemeOverride(initialScheme);
        setNativeAppearance(initialMode);
        if (active) {
          setModeState(initialMode);
          setReady(true);
        }
      });

    void loadGlassEffectLevel(
      AsyncStorage,
      nativeEffects.glass.defaultIntensity,
    )
      .then((initialGlassLevel) => {
        setDesignSystemGlassEffectLevel(initialGlassLevel);
      })
      .catch((error: unknown) => {
        console.error("Unable to load the saved glass effect.", error);
      });

    if (__DEV__ && !contrastAuditHasRun) {
      contrastAuditHasRun = true;
      logContrastAudit({ light: lightColors, dark: darkColors });
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setColorSchemeOverride(scheme);
  }, [scheme]);

  useEffect(() => {
    setNativeAppearance(mode);
  }, [mode]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[theme]", {
        mode,
        systemScheme: normalizedSystemScheme,
        scheme,
      });
    }
  }, [mode, normalizedSystemScheme, scheme]);

  const setMode = useCallback(
    async (nextMode: ThemeMode) => {
      const previousMode = mode;
      setModeState(nextMode);
      setNativeAppearance(nextMode);
      setColorSchemeOverride(
        resolveScheme(nextMode, systemSchemeRef.current),
      );
      try {
        await persistThemeMode(AsyncStorage, nextMode);
      } catch (error) {
        setModeState(previousMode);
        setNativeAppearance(previousMode);
        setColorSchemeOverride(
          resolveScheme(previousMode, systemSchemeRef.current),
        );
        throw error;
      }
    },
    [mode],
  );

  const value = useMemo(
    () => ({ colors, scheme, isDark: scheme === "dark", mode, setMode }),
    [colors, mode, scheme, setMode],
  );

  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
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
  control: nativeLayout.pillRadius,
  panel: 32,
  field: 20,
  thumb: 14,
} as const;
