import assert from "node:assert/strict";
import test from "node:test";

import {
  colorSchemeForMode,
  DEFAULT_GLASS_LEVEL,
  GLASS_LEVEL_KEY,
  isGlassLevel,
  loadGlassLevel,
  loadThemeMode,
  persistGlassLevel,
  persistThemeMode,
  resolveColorScheme,
  THEME_MODE_KEY,
} from "./theme-mode.ts";

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("missing or invalid theme preferences use system mode", async () => {
  assert.equal(await loadThemeMode(createMemoryStorage()), "system");
  assert.equal(
    await loadThemeMode(createMemoryStorage({ [THEME_MODE_KEY]: "sepia" })),
    "system",
  );
});

test("each theme preference persists and reloads", async () => {
  const storage = createMemoryStorage();

  for (const mode of ["system", "light", "dark"]) {
    await persistThemeMode(storage, mode);

    assert.equal(storage.values.get(THEME_MODE_KEY), mode);
    assert.equal(await loadThemeMode(storage), mode);
  }
});

test("system mode resets Appearance while explicit modes override it", () => {
  assert.equal(colorSchemeForMode("system"), null);
  assert.equal(colorSchemeForMode("light"), "light");
  assert.equal(colorSchemeForMode("dark"), "dark");
});

test("automatic mode follows system appearance changes without restarting", () => {
  assert.equal(resolveColorScheme("system", "light"), "light");
  assert.equal(resolveColorScheme("system", "dark"), "dark");
  assert.equal(resolveColorScheme("system", "light"), "light");
  assert.equal(resolveColorScheme("system", null), "light");
});

test("fixed theme modes ignore system appearance changes", () => {
  for (const systemScheme of ["light", "dark", null]) {
    assert.equal(resolveColorScheme("light", systemScheme), "light");
    assert.equal(resolveColorScheme("dark", systemScheme), "dark");
  }
});

test("glass level defaults to clear and ignores invalid or legacy values", async () => {
  assert.equal(await loadGlassLevel(createMemoryStorage()), DEFAULT_GLASS_LEVEL);
  assert.equal(
    await loadGlassLevel(
      createMemoryStorage({ [GLASS_LEVEL_KEY]: "frosted" }),
    ),
    "clear",
  );
  assert.equal(
    await loadGlassLevel(
      createMemoryStorage({ glassEffectLevel: "0.73" }),
    ),
    "clear",
  );
  assert.equal(isGlassLevel("medium"), true);
  assert.equal(isGlassLevel("matte"), true);
  assert.equal(isGlassLevel("liquid"), false);
});

test("glass level preference persists and reloads", async () => {
  const storage = createMemoryStorage();
  await persistGlassLevel(storage, "matte");
  assert.equal(storage.values.get(GLASS_LEVEL_KEY), "matte");
  assert.equal(await loadGlassLevel(storage), "matte");
});
