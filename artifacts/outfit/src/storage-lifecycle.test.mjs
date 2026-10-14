import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorage } from "./storage-core.ts";
import { createWardrobeActions } from "./wardrobe-actions.ts";

function createTestEnvironment() {
  const values = new Map();
  const files = new Map();
  const directories = new Set();
  const errors = [];
  const asyncStorage = {
    async multiGet(keys) {
      return keys.map((key) => [key, values.get(key) ?? null]);
    },
    async multiSet(entries) {
      for (const [key, value] of entries) values.set(key, value);
    },
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
  const fileSystem = {
    documentDirectory: "file:///app/documents/",
    async getInfoAsync(uri) {
      return { exists: directories.has(uri) || files.has(uri) };
    },
    async makeDirectoryAsync(uri) {
      directories.add(uri);
    },
    async copyAsync({ from, to }) {
      if (!files.has(from)) throw new Error(`Missing source photo: ${from}`);
      files.set(to, files.get(from));
    },
    async deleteAsync(uri) {
      files.delete(uri);
    },
  };
  const storage = createLocalStorage({
    asyncStorage,
    fileSystem,
    platform: "ios",
    persistWebImage: async () => {
      throw new Error("Web image persistence is not used in native tests.");
    },
  });

  let currentData = { profile: null, wardrobe: [] };
  const actions = createWardrobeActions({
    getData: () => currentData,
    async commit(next) {
      await storage.saveAppData(next);
      currentData = next;
    },
    copyImageToAppDocuments: storage.copyImageToAppDocuments,
    removeStoredImage: storage.removeStoredImage,
    onError(error) {
      errors.push(error);
    },
  });

  return {
    actions,
    errors,
    fileSystem,
    files,
    storage,
    async reload() {
      currentData = await storage.loadAppData();
      return currentData;
    },
    setSourcePhoto(uri, contents) {
      files.set(uri, contents);
    },
  };
}

test("a captured photo is copied into app documents and remains readable after reload", async () => {
  const env = createTestEnvironment();
  const cameraUri = "file:///camera/capture-1.jpg";
  env.setSourcePhoto(cameraUri, "captured-image-bytes");

  const savedItem = await env.actions.addItem({
    imageUri: cameraUri,
    note: "Linen shirt",
  });

  assert.match(savedItem.imageUri, /^file:\/\/\/app\/documents\/outfit\/wardrobe\//);
  assert.notEqual(savedItem.imageUri, cameraUri);
  assert.equal(env.files.get(savedItem.imageUri), "captured-image-bytes");

  const reloaded = await env.reload();
  assert.deepEqual(reloaded.wardrobe, [savedItem]);
  assert.equal(env.files.get(reloaded.wardrobe[0].imageUri), "captured-image-bytes");
  assert.equal((await env.fileSystem.getInfoAsync(reloaded.wardrobe[0].imageUri)).exists, true);
});

test("replacing a photo persists the new URI and removes the previous managed file", async () => {
  const env = createTestEnvironment();
  env.setSourcePhoto("file:///picker/first.jpg", "first-image");
  env.setSourcePhoto("file:///picker/replacement.png", "replacement-image");
  const savedItem = await env.actions.addItem({
    imageUri: "file:///picker/first.jpg",
    note: "Blue jacket",
  });
  const oldUri = savedItem.imageUri;

  await env.actions.updateItem(savedItem.id, {
    imageUri: "file:///picker/replacement.png",
    note: "Updated jacket",
  });

  const reloaded = await env.reload();
  assert.equal(reloaded.wardrobe.length, 1);
  assert.notEqual(reloaded.wardrobe[0].imageUri, oldUri);
  assert.equal(reloaded.wardrobe[0].note, "Updated jacket");
  assert.equal(env.files.has(oldUri), false);
  assert.equal(env.files.get(reloaded.wardrobe[0].imageUri), "replacement-image");
  assert.deepEqual(env.errors, []);
});

test("editing only an item's note preserves its saved photo", async () => {
  const env = createTestEnvironment();
  env.setSourcePhoto("file:///picker/unchanged.jpg", "saved-photo");
  const savedItem = await env.actions.addItem({
    imageUri: "file:///picker/unchanged.jpg",
    note: "First note",
  });

  await env.actions.updateItem(savedItem.id, { note: "Revised note" });

  const reloaded = await env.reload();
  assert.equal(reloaded.wardrobe[0].note, "Revised note");
  assert.equal(reloaded.wardrobe[0].imageUri, savedItem.imageUri);
  assert.equal(env.files.get(savedItem.imageUri), "saved-photo");
});

test("deleting a wardrobe item removes its saved record and managed photo", async () => {
  const env = createTestEnvironment();
  env.setSourcePhoto("file:///camera/capture-to-delete.jpg", "temporary-image");
  const savedItem = await env.actions.addItem({
    imageUri: "file:///camera/capture-to-delete.jpg",
    note: "Shoes",
  });

  await env.actions.removeItem(savedItem.id);

  const reloaded = await env.reload();
  assert.deepEqual(reloaded.wardrobe, []);
  assert.equal(env.files.has(savedItem.imageUri), false);
});
