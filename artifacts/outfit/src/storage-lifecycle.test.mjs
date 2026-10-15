import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorage } from "./storage-core.ts";
import { createWardrobeActions } from "./wardrobe-actions.ts";
import { saveGallerySelection } from "./gallery-save.ts";
import { getStartupScreen } from "./onboarding-progress.ts";
import { updateAndSaveProfile } from "./profile-update.ts";
import { saveProfileWithPhoto } from "./profile-storage.ts";

function createTestEnvironment(platform = "ios") {
  const values = new Map();
  const files = new Map();
  const directories = new Set();
  const errors = [];
  let failNextMetadataWrite = false;
  let failNextDelete = false;
  const asyncStorage = {
    async multiGet(keys) {
      return keys.map((key) => [key, values.get(key) ?? null]);
    },
    async multiSet(entries) {
      if (failNextMetadataWrite) {
        failNextMetadataWrite = false;
        throw new Error("Metadata persistence failed.");
      }
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
    async readDirectoryAsync(uri) {
      const prefix = uri.endsWith("/") ? uri : `${uri}/`;
      return [...files.keys()]
        .filter((path) => path.startsWith(prefix))
        .map((path) => path.slice(prefix.length))
        .filter((filename) => filename.length > 0 && !filename.includes("/"));
    },
    async makeDirectoryAsync(uri) {
      directories.add(uri);
    },
    async copyAsync({ from, to }) {
      if (!files.has(from)) throw new Error(`Missing source photo: ${from}`);
      files.set(to, files.get(from));
    },
    async deleteAsync(uri) {
      if (failNextDelete) {
        failNextDelete = false;
        throw new Error("Photo cleanup failed.");
      }
      files.delete(uri);
    },
  };
  const createStorage = () =>
    createLocalStorage({
      asyncStorage,
      fileSystem,
      platform,
      persistWebImage: async () => {
        throw new Error("Web image persistence is not used in native tests.");
      },
    });
  let storage = createStorage();

  let currentData = { profile: null, wardrobe: [] };
  async function saveProfile(profile) {
    return saveProfileWithPhoto(profile, currentData, {
      copyImageToAppDocuments: storage.copyImageToAppDocuments,
      async commit(next) {
        await storage.saveAppData(next);
        currentData = next;
      },
      removeStoredImage: storage.removeStoredImage,
    });
  }
  const actions = createWardrobeActions({
    getData: () => currentData,
    async commit(next) {
      await storage.saveAppData(next);
      currentData = next;
    },
    copyImageToAppDocuments: storage.copyImageToAppDocuments,
    removeStoredImage: storage.removeStoredImage,
    removeUnreferencedStoredImage: storage.removeUnreferencedStoredImage,
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
    async updateProfile(updates) {
      return updateAndSaveProfile(currentData.profile, updates, saveProfile);
    },
    async reload() {
      currentData = await storage.loadAppData();
      return currentData;
    },
    async restart() {
      storage = createStorage();
      currentData = await storage.loadAppData();
      return currentData;
    },
    async seedProfile(profile) {
      await storage.saveAppData({ profile, wardrobe: [] });
      currentData = { profile, wardrobe: [] };
    },
    setSourcePhoto(uri, contents) {
      files.set(uri, contents);
    },
    failNextMetadataWrite() {
      failNextMetadataWrite = true;
    },
    failNextDelete() {
      failNextDelete = true;
    },
  };
}

for (const platform of ["ios", "android"]) {
  test(`${platform} profile edits remain saved after restarting without reopening setup`, async () => {
    const env = createTestEnvironment(platform);
    const originalProfile = {
      name: "Alex",
      preferredName: "A",
      gender: "female",
      age: 30,
      heightCm: 170,
      bodyPhotoUri: "",
      city: "Madrid",
      latitude: 40.4,
      longitude: -3.7,
      photoConsent: true,
      onboardingCompleted: true,
    };
    await env.seedProfile(originalProfile);

    await env.updateProfile({
      name: "Alex Rivera",
      preferredName: "Lex",
      age: 34,
      heightCm: 176,
      city: "Sevilla",
      latitude: 37.4,
      longitude: -5.9,
    });

    const restarted = await env.restart();
    assert.deepEqual(restarted.profile, {
      ...originalProfile,
      name: "Alex Rivera",
      preferredName: "Lex",
      age: 34,
      heightCm: 176,
      city: "Sevilla",
      latitude: 37.4,
      longitude: -5.9,
    });
    assert.equal(getStartupScreen(false, restarted.profile), "home");
  });
}

test("a captured photo is copied into app documents and remains readable after reload", async () => {
  const env = createTestEnvironment();
  const cameraUri = "file:///camera/capture-1.jpg";
  env.setSourcePhoto(cameraUri, "captured-image-bytes");

  const savedItem = await env.actions.addItem({
    imageUri: cameraUri,
    note: "Linen shirt",
  });

  assert.match(
    savedItem.imageUri,
    /^file:\/\/\/app\/documents\/outfit\/wardrobe\//,
  );
  assert.notEqual(savedItem.imageUri, cameraUri);
  assert.equal(env.files.get(savedItem.imageUri), "captured-image-bytes");

  const reloaded = await env.reload();
  assert.deepEqual(reloaded.wardrobe, [savedItem]);
  assert.equal(
    env.files.get(reloaded.wardrobe[0].imageUri),
    "captured-image-bytes",
  );
  assert.equal(
    (await env.fileSystem.getInfoAsync(reloaded.wardrobe[0].imageUri)).exists,
    true,
  );
});

test("all 60 gallery photos remain saved and readable after reload", async () => {
  const env = createTestEnvironment();
  const assets = Array.from({ length: 60 }, (_, index) => {
    const uri = `file:///picker/wardrobe-${index + 1}.jpg`;
    env.setSourcePhoto(uri, `image-bytes-${index + 1}`);
    return { uri };
  });

  const result = await saveGallerySelection(assets, (item) =>
    env.actions.addItem(item),
  );
  assert.deepEqual(result, { added: 60, failed: 0 });

  const reloaded = await env.reload();
  assert.equal(reloaded.wardrobe.length, 60);
  for (let index = 0; index < reloaded.wardrobe.length; index += 1) {
    const item = reloaded.wardrobe[index];
    assert.equal(item.note, "");
    assert.equal(env.files.get(item.imageUri), `image-bytes-${index + 1}`);
    assert.equal(
      (await env.fileSystem.getInfoAsync(item.imageUri)).exists,
      true,
    );
  }
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
  assert.equal(
    env.files.get(reloaded.wardrobe[0].imageUri),
    "replacement-image",
  );
  assert.deepEqual(env.errors, []);
});

test("a failed wardrobe save removes the copied photo", async () => {
  const env = createTestEnvironment();
  const sourceUri = "file:///picker/save-failure.jpg";
  env.setSourcePhoto(sourceUri, "save-failure-image");
  env.failNextMetadataWrite();

  await assert.rejects(
    env.actions.addItem({ imageUri: sourceUri, note: "Green coat" }),
    /Metadata persistence failed/,
  );

  const managedPhotos = [...env.files.keys()].filter((uri) =>
    uri.startsWith("file:///app/documents/outfit/wardrobe/"),
  );
  assert.deepEqual(managedPhotos, []);
  assert.deepEqual((await env.reload()).wardrobe, []);
});

test("a failed replacement commit removes the new photo but keeps the old one", async () => {
  const env = createTestEnvironment();
  env.setSourcePhoto("file:///picker/original.jpg", "original-image");
  env.setSourcePhoto("file:///picker/replacement.jpg", "replacement-image");
  const item = await env.actions.addItem({
    imageUri: "file:///picker/original.jpg",
    note: "Coat",
  });
  env.failNextMetadataWrite();

  await assert.rejects(
    env.actions.updateItem(item.id, {
      imageUri: "file:///picker/replacement.jpg",
    }),
    /Metadata persistence failed/,
  );

  assert.equal(env.files.has(item.imageUri), true);
  const reloaded = await env.reload();
  assert.equal(reloaded.wardrobe[0].imageUri, item.imageUri);
  assert.equal(
    [...env.files.keys()].filter((uri) =>
      uri.startsWith("file:///app/documents/outfit/wardrobe/"),
    ).length,
    1,
  );
});

test("an interrupted old-photo cleanup is reconciled on the next load", async () => {
  const env = createTestEnvironment();
  env.setSourcePhoto("file:///picker/original.jpg", "original-image");
  env.setSourcePhoto("file:///picker/replacement.jpg", "replacement-image");
  const item = await env.actions.addItem({
    imageUri: "file:///picker/original.jpg",
    note: "Coat",
  });
  env.failNextDelete();

  await assert.rejects(
    env.actions.updateItem(item.id, {
      imageUri: "file:///picker/replacement.jpg",
    }),
    /Photo cleanup failed/,
  );

  const updated = await env.reload();
  assert.notEqual(updated.wardrobe[0].imageUri, item.imageUri);
  assert.equal(env.files.has(updated.wardrobe[0].imageUri), true);
  assert.equal(env.files.has(item.imageUri), false);
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
