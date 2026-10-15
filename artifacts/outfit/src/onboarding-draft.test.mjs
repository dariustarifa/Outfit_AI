import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorage } from "./storage-core.ts";

const draft = {
  name: "Ada Lovelace",
  preferredName: "",
  age: "3",
  heightCm: "",
  city: "London",
  bodyPhotoUri: "file:///app/documents/outfit/wardrobe/draft-photo.jpg",
  photoConsent: false,
  step: 2,
  selectedCity: {
    name: "London",
    latitude: 51.5072,
    longitude: -0.1276,
  },
};

function createEnvironment(asyncStorageOverrides = {}) {
  const values = new Map();
  const files = new Set([draft.bodyPhotoUri]);
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
    ...asyncStorageOverrides,
  };
  const fileSystem = {
    documentDirectory: "file:///app/documents/",
    async getInfoAsync(uri) {
      return {
        exists:
          uri === "file:///app/documents/outfit/wardrobe/" ||
          files.has(uri),
      };
    },
    async readDirectoryAsync() {
      return [...files].map((uri) => uri.split("/").pop());
    },
    async makeDirectoryAsync() {},
    async copyAsync() {},
    async deleteAsync(uri) {
      files.delete(uri);
    },
  };
  const createStorage = () =>
    createLocalStorage({
      asyncStorage,
      fileSystem,
      platform: "ios",
      persistWebImage: async () => {
        throw new Error("Web image persistence is not used in this test.");
      },
      resizeProfilePhoto: async (uri) => uri,
    });

  return { createStorage, files, values };
}

test("an unfinished setup draft restores its values and active step after reload", async () => {
  const env = createEnvironment();
  await env.createStorage().saveOnboardingDraft(draft);

  const restartedStorage = env.createStorage();
  assert.deepEqual(await restartedStorage.loadOnboardingDraft(), draft);
  assert.equal((await restartedStorage.loadAppData()).profile, null);
  assert.equal(env.files.has(draft.bodyPhotoUri), true);
});

test("clearing the draft removes its saved image on the next app-data load", async () => {
  const env = createEnvironment();
  const storage = env.createStorage();
  await storage.saveOnboardingDraft(draft);
  await storage.clearOnboardingDraft();

  assert.equal(await storage.loadOnboardingDraft(), null);
  await storage.loadAppData();
  assert.equal(env.files.has(draft.bodyPhotoUri), false);
});

test("draft saves reject malformed data and surface storage failures", async () => {
  const env = createEnvironment({
    async setItem() {
      throw new Error("Disk is full.");
    },
  });
  const storage = env.createStorage();

  await assert.rejects(
    storage.saveOnboardingDraft({ ...draft, step: 8 }),
    /does not match the current app format/,
  );
  await assert.rejects(
    storage.saveOnboardingDraft(draft),
    /Disk is full/,
  );
});

test("queued draft writes preserve the latest edit when saves overlap", async () => {
  let releaseFirstWrite;
  let firstWriteStarted;
  const firstWriteStartedPromise = new Promise((resolve) => {
    firstWriteStarted = resolve;
  });
  const firstWriteGate = new Promise((resolve) => {
    releaseFirstWrite = resolve;
  });
  const env = createEnvironment({
    async setItem(key, value) {
      const parsed = JSON.parse(value);
      if (parsed.name === "First edit") {
        firstWriteStarted();
        await firstWriteGate;
      }
      env.values.set(key, value);
    },
  });
  const storage = env.createStorage();

  const firstSave = storage.saveOnboardingDraft({
    ...draft,
    name: "First edit",
  });
  await firstWriteStartedPromise;
  const secondSave = storage.saveOnboardingDraft({
    ...draft,
    name: "Latest edit",
  });
  releaseFirstWrite();
  await Promise.all([firstSave, secondSave]);

  assert.equal(
    (await storage.loadOnboardingDraft()).name,
    "Latest edit",
  );
});
