import { useSyncExternalStore } from "react";
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

export function useDesignColorScheme(): ColorScheme {
  const override = useSyncExternalStore(subscribe, getOverride, () => undefined);
  return override ?? "light";
}

export function useColors() {
  const scheme = useDesignColorScheme();
  return scheme === "dark" ? nativeTheme.dark : nativeTheme.light;
}
