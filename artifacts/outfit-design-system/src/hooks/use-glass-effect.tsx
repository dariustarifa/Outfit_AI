import { useSyncExternalStore } from "react";
import { nativeEffects } from "../lib/native-theme";

let glassEffectLevel: number = nativeEffects.glass.defaultIntensity;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return glassEffectLevel;
}

export function normalizeGlassEffectLevel(value: number): number {
  if (!Number.isFinite(value)) return nativeEffects.glass.defaultIntensity;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

export function setGlassEffectLevel(value: number) {
  const nextLevel = normalizeGlassEffectLevel(value);
  if (glassEffectLevel === nextLevel) return;
  glassEffectLevel = nextLevel;
  listeners.forEach((listener) => listener());
}

export function useGlassEffectLevel() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => nativeEffects.glass.defaultIntensity,
  );
}
