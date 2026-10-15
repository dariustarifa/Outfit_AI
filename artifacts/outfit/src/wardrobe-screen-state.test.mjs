import assert from "node:assert/strict";
import test from "node:test";
import { createWardrobeActions } from "./wardrobe-actions.ts";
import { getWardrobeScreenState } from "./wardrobe-search.ts";

test("the wardrobe search count follows saved edits and removals", async () => {
  let data = {
    profile: null,
    wardrobe: [
      {
        id: "jacket",
        imageUri: "jacket.jpg",
        note: "Blue jacket",
        createdAt: 1,
      },
      {
        id: "shirt",
        imageUri: "shirt.jpg",
        note: "White shirt",
        createdAt: 2,
      },
      {
        id: "shoes",
        imageUri: "shoes.jpg",
        note: "Black shoes",
        createdAt: 3,
      },
    ],
  };
  const actions = createWardrobeActions({
    getData: () => data,
    commit: async (next) => {
      data = next;
    },
    copyImageToAppDocuments: async (uri) => uri,
    removeStoredImage: async () => {},
    removeUnreferencedStoredImage: async () => {},
    onError: () => {},
  });
  const countForBlueSearch = () =>
    getWardrobeScreenState(data.wardrobe, "blue").displayCount;

  assert.equal(countForBlueSearch(), 1);
  assert.deepEqual(
    getWardrobeScreenState(data.wardrobe, "blue").filteredWardrobe.map(
      (item) => item.id,
    ),
    ["jacket"],
  );

  await actions.updateItem("shirt", { note: "Blue shirt" });
  assert.equal(countForBlueSearch(), 2);

  await actions.updateItem("jacket", { note: "Green jacket" });
  assert.equal(countForBlueSearch(), 1);

  await actions.removeItem("shirt");
  assert.equal(countForBlueSearch(), 0);

  assert.equal(getWardrobeScreenState(data.wardrobe, "").displayCount, 2);
});
