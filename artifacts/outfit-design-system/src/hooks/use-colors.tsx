import { useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { nativeTheme } from "../lib/native-theme";

type ColorScheme = "light" | "dark";

let colorSchemeOverride: ColorScheme | null | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getOverride() {
  return colorSchemeOverride;
}

export function setColorSchemeOverride(scheme: ColorScheme | null) {
  if (colorSchemeOverride === scheme) return;
  colorSchemeOverride = scheme;
  listeners.forEach((listener) => listener());
}

export function useDesignColorScheme(): ColorScheme | null {
  const systemScheme = useColorScheme();
  const override = useSyncExternalStore(subscribe, getOverride, () => undefined);
  const selectedScheme = override ?? systemScheme;
  return selectedScheme === "dark" || selectedScheme === "light"
    ? selectedScheme
    : null;
}

export function useColors() {
  const scheme = useDesignColorScheme();
  return scheme === "dark" ? nativeTheme.dark : nativeTheme.light;
}
