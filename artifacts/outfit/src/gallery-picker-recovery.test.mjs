import assert from "node:assert/strict";
import test from "node:test";
import { createGalleryPickerRecoveryStore } from "./gallery-picker-recovery.ts";

function createMemoryStorage() {
  const values = new Map();
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

const itemIntent = {
  target: "item",
  itemId: "shirt-1",
  returnTo: "wardrobe",
  note: "Draft note",
  photoUri: "file:///draft.jpg",
};

test("picker recovery survives a storage reload with its flow and draft intact", async () => {
  const storage = createMemoryStorage();
  await createGalleryPickerRecoveryStore(storage).saveIntent(itemIntent);

  const restartedStore = createGalleryPickerRecoveryStore(storage);
  assert.deepEqual(await restartedStore.load(), { intent: itemIntent });

  await restartedStore.saveOutcome({
    status: "selected",
    assets: [{ uri: "file:///selected.jpg" }],
  });
  assert.deepEqual(await restartedStore.load(), {
    intent: itemIntent,
    outcome: {
      status: "selected",
      assets: [{ uri: "file:///selected.jpg" }],
    },
  });
});

test("cancelled and failed outcomes retain the original draft", async () => {
  for (const outcome of [{ status: "cancelled" }, { status: "error" }]) {
    const storage = createMemoryStorage();
    const store = createGalleryPickerRecoveryStore(storage);
    await store.saveIntent(itemIntent);
    await store.saveOutcome(outcome);

    const recovered = await store.load();
    assert.deepEqual(recovered?.intent, itemIntent);
    assert.deepEqual(recovered?.outcome, outcome);
  }
});

test("clearing a handled result removes its pending recovery record", async () => {
  const storage = createMemoryStorage();
  const store = createGalleryPickerRecoveryStore(storage);
  await store.saveIntent(itemIntent);
  await store.saveOutcome({ status: "cancelled" });

  await store.clear();

  assert.equal(await store.load(), null);
});
