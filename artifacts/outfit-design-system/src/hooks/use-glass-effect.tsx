import { useSyncExternalStore } from "react";
import { nativeEffects } from "../lib/native-theme";

export type GlassLevel = "clear" | "medium" | "matte";

let glassLevel: GlassLevel = nativeEffects.glass.defaultLevel;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): GlassLevel {
  return glassLevel;
}

export function normalizeGlassLevel(value: string): GlassLevel {
  return value === "clear" || value === "medium" || value === "matte"
    ? value
    : nativeEffects.glass.defaultLevel;
}

export function setGlassLevel(value: GlassLevel) {
  const nextLevel = normalizeGlassLevel(value);
  if (glassLevel === nextLevel) return;
  glassLevel = nextLevel;
  listeners.forEach((listener) => listener());
}

export function useGlassLevel() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => nativeEffects.glass.defaultLevel,
  );
}
