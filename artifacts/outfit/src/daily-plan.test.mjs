import assert from "node:assert/strict";
import test from "node:test";
import {
  DAILY_PLAN_KEY,
  DAILY_PLAN_MAX_LENGTH,
  loadDailyPlan,
  normalizeDailyPlan,
  persistDailyPlan,
} from "./daily-plan.ts";
import { recommendDailyOutfit } from "./services/daily-recommendation.ts";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

const wardrobe = [
  { id: "top", imageUri: "top.jpg", note: "camisa azul", createdAt: 1 },
  { id: "bottom", imageUri: "bottom.jpg", note: "pantalón negro", createdAt: 2 },
];

test("daily plans normalize whitespace and stay within the short-input limit", () => {
  const normalized = normalizeDailyPlan(`  trabajo\n${"a".repeat(DAILY_PLAN_MAX_LENGTH)}  `);

  assert.equal(normalized.length, DAILY_PLAN_MAX_LENGTH);
  assert.equal(normalizeDailyPlan("  paseo   por el parque  "), "paseo por el parque");
});

test("daily plans persist locally and can be changed or cleared", async () => {
  const storage = memoryStorage();

  assert.equal(await loadDailyPlan(storage), null);
  assert.equal(await persistDailyPlan(storage, "  cena con amigos  "), "cena con amigos");
  assert.equal(storage.values.get(DAILY_PLAN_KEY), "cena con amigos");
  assert.equal(await loadDailyPlan(storage), "cena con amigos");

  await persistDailyPlan(storage, " paseo ");
  assert.equal(await loadDailyPlan(storage), "paseo");

  await persistDailyPlan(storage, "");
  assert.equal(storage.values.has(DAILY_PLAN_KEY), false);
  assert.equal(await loadDailyPlan(storage), null);
});

test("recommendation explains today's plan without inventing wardrobe pieces", () => {
  const recommendation = recommendDailyOutfit(
    wardrobe,
    new Date(2026, 9, 15),
    null,
    "reunión de trabajo",
  );

  assert.match(recommendation.explanation, /reunión de trabajo/);
  assert.ok(
    recommendation.items.every(({ item }) =>
      wardrobe.some((savedItem) => savedItem.id === item.id),
    ),
  );
});
