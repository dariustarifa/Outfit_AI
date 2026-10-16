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
import { nativeTheme } from "@workspace/outfit-design-system/lib/native-theme";
import { setColorSchemeOverride } from "@workspace/outfit-design-system/hooks/use-colors";
import {
  colorSchemeForMode,
  loadThemeMode,
  persistThemeMode,
  resolveColorScheme,
  type ThemeMode,
} from "../theme-mode";
import { logContrastAudit } from "./contrast";

const lightColors = nativeTheme.light;
const darkColors = nativeTheme.dark;
export type ThemeColors = typeof nativeTheme.light | typeof nativeTheme.dark;

type ColorScheme = "light" | "dark";
type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ColorScheme;
  systemScheme: ColorScheme | null;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
let contrastAuditHasRun = false;

function setNativeAppearance(mode: ThemeMode) {
  if (Platform.OS !== "web") {
    Appearance.setColorScheme(colorSchemeForMode(mode) as never);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const normalizedSystemScheme: ColorScheme | null =
    systemScheme === "dark" ? "dark" : systemScheme === "light" ? "light" : null;
  const systemSchemeRef = useRef<ColorScheme | null>(normalizedSystemScheme);
  systemSchemeRef.current = normalizedSystemScheme;
  const [mode, setModeState] = useState<ThemeMode>("system");
  const modeRef = useRef<ThemeMode>("system");
  const [ready, setReady] = useState(false);
  const scheme = resolveColorScheme(mode, normalizedSystemScheme);
  const colors = scheme === "dark" ? darkColors : lightColors;
  modeRef.current = mode;

  useEffect(() => {
    let active = true;

    void loadThemeMode(AsyncStorage)
      .catch((error: unknown) => {
        console.error("Unable to load the saved appearance mode.", error);
        return "system" as const;
      })
      .then((initialMode) => {
        const initialScheme = resolveColorScheme(
          initialMode,
          systemSchemeRef.current,
        );
        setColorSchemeOverride(initialScheme);
        setNativeAppearance(initialMode);
        if (active) {
          setModeState(initialMode);
          modeRef.current = initialMode;
          setReady(true);
        }
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

  const setMode = useCallback(async (nextMode: ThemeMode) => {
      const previousMode = modeRef.current;
      modeRef.current = nextMode;
      setModeState(nextMode);
      setNativeAppearance(nextMode);
      setColorSchemeOverride(
        resolveColorScheme(nextMode, systemSchemeRef.current),
      );
      try {
        await persistThemeMode(AsyncStorage, nextMode);
      } catch (error) {
        if (modeRef.current === nextMode) {
          modeRef.current = previousMode;
          setModeState(previousMode);
          setNativeAppearance(previousMode);
          setColorSchemeOverride(
            resolveColorScheme(previousMode, systemSchemeRef.current),
          );
        }
        throw error;
      }
    }, []);

  const value = useMemo(
    () => ({
      colors,
      scheme,
      systemScheme: normalizedSystemScheme,
      isDark: scheme === "dark",
      mode,
      setMode,
    }),
    [mode, normalizedSystemScheme, scheme, setMode],
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
