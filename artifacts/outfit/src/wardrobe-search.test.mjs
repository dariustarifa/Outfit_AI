import assert from "node:assert/strict";
import test from "node:test";
import { searchWardrobeItems } from "./wardrobe-search.ts";

const items = [
  { id: "shirt", imageUri: "shirt.jpg", note: "Camisa básica azul" },
  { id: "coat", imageUri: "coat.jpg", note: "Abrigo de invierno" },
  { id: "shoes", imageUri: "shoes.jpg", note: "Zapatos cómodos" },
];

test("an empty wardrobe search keeps every saved item", () => {
  assert.deepEqual(searchWardrobeItems(items, "   "), items);
});

test("a wardrobe search matches note text without case or accent differences", () => {
  assert.deepEqual(
    searchWardrobeItems(items, "BASICA").map((item) => item.id),
    ["shirt"],
  );
  assert.deepEqual(
    searchWardrobeItems(items, "camisa").map((item) => item.id),
    ["shirt"],
  );
});

test("a wardrobe search with no matches returns no items", () => {
  assert.deepEqual(searchWardrobeItems(items, "vestido"), []);
});
