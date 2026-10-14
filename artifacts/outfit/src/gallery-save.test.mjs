import assert from "node:assert/strict";
import test from "node:test";
import { saveGallerySelection } from "./gallery-save.ts";

test("saves all 60 gallery photos sequentially with empty notes", async () => {
  const assets = Array.from({ length: 60 }, (_, index) => ({
    uri: `file:///gallery/photo-${index}.jpg`,
  }));
  const saved = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const result = await saveGallerySelection(
    assets,
    async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      saved.push(item);
      inFlight -= 1;
    },
  );

  assert.deepEqual(result, { added: 60, failed: 0 });
  assert.equal(maxInFlight, 1);
  assert.equal(saved.length, 60);
  assert.ok(saved.every((item, index) =>
    item.imageUri === assets[index].uri && item.note === "",
  ));
});

test("continues saving the remaining gallery photos after one save fails", async () => {
  const assets = Array.from({ length: 5 }, (_, index) => ({
    uri: `file:///gallery/photo-${index}.jpg`,
  }));
  const attempted = [];

  const result = await saveGallerySelection(assets, async (item) => {
    attempted.push(item.imageUri);
    if (item.imageUri === assets[2].uri) throw new Error("copy failed");
  });

  assert.deepEqual(result, { added: 4, failed: 1 });
  assert.equal(attempted.length, 5);
});
