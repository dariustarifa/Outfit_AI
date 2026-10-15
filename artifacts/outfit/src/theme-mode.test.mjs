import assert from "node:assert/strict";
import test from "node:test";

import {
  colorSchemeForMode,
  loadThemeMode,
  persistThemeMode,
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

test("theme preference persists and reloads", async () => {
  const storage = createMemoryStorage();

  await persistThemeMode(storage, "dark");

  assert.equal(storage.values.get(THEME_MODE_KEY), "dark");
  assert.equal(await loadThemeMode(storage), "dark");
});

test("system mode resets Appearance while explicit modes override it", () => {
  assert.equal(colorSchemeForMode("system"), null);
  assert.equal(colorSchemeForMode("light"), "light");
  assert.equal(colorSchemeForMode("dark"), "dark");
});
