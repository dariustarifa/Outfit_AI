import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorage } from "./storage-core.ts";
import { saveProfileWithPhoto } from "./profile-storage.ts";

const profile = {
  name: "Ada Lovelace",
  preferredName: "Ada",
  age: 36,
  heightCm: 168,
  bodyPhotoUri: "",
  city: "London",
  latitude: 51.5072,
  longitude: -0.1276,
  photoConsent: true,
  onboardingCompleted: false,
};

function createEnvironment(platform) {
  const values = new Map();
  const files = new Map();
  const directories = new Set();
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
      return { exists: files.has(uri) || directories.has(uri) };
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
      if (!files.has(from)) throw new Error(`Missing source image: ${from}`);
      files.set(to, files.get(from));
    },
    async deleteAsync(uri) {
      files.delete(uri);
    },
  };
  const storage = createLocalStorage({
    asyncStorage,
    fileSystem,
    platform,
    persistWebImage: async () => {
      throw new Error("Web image persistence is not used in native tests.");
    },
  });
  let currentData = { profile: null, wardrobe: [] };
  const dependencies = {
    copyImageToAppDocuments: storage.copyImageToAppDocuments,
    async commit(next) {
      await storage.saveAppData(next);
      currentData = next;
    },
    removeStoredImage: storage.removeStoredImage,
  };

  return {
    files,
    fileSystem,
    save: (nextProfile) =>
      saveProfileWithPhoto(nextProfile, currentData, dependencies),
    async reload() {
      currentData = await storage.loadAppData();
      return currentData;
    },
    addSource(uri, contents) {
      files.set(uri, contents);
    },
  };
}

for (const platform of ["ios", "android"]) {
  for (const [source, sourceUri] of [
    ["gallery", "file:///picker/profile-photo.jpg"],
    ["camera", "file:///camera/profile-photo.jpg"],
  ]) {
    test(`${platform} ${source} profile photo is copied and remains available after reload`, async () => {
      const env = createEnvironment(platform);
      env.addSource(sourceUri, `${platform}-${source}-image-bytes`);

      const saved = await env.save({ ...profile, bodyPhotoUri: sourceUri });
      assert.ok(
        saved.bodyPhotoUri.startsWith("file:///app/documents/outfit/wardrobe/"),
      );
      assert.notEqual(saved.bodyPhotoUri, sourceUri);
      assert.equal(
        env.files.get(saved.bodyPhotoUri),
        `${platform}-${source}-image-bytes`,
      );
      assert.equal(saved.onboardingCompleted, false);

      const reloaded = await env.reload();
      assert.equal(reloaded.profile.bodyPhotoUri, saved.bodyPhotoUri);
      assert.equal(
        env.files.get(reloaded.profile.bodyPhotoUri),
        `${platform}-${source}-image-bytes`,
      );
      assert.equal(
        (await env.fileSystem.getInfoAsync(reloaded.profile.bodyPhotoUri))
          .exists,
        true,
      );
    });
  }
}

test("a failed native photo copy prevents profile persistence", async () => {
  const env = createEnvironment("ios");

  await assert.rejects(
    env.save({ ...profile, bodyPhotoUri: "file:///missing/photo.jpg" }),
    /Missing source image/,
  );
  const reloaded = await env.reload();
  assert.equal(reloaded.profile, null);
});

test("loading saved data preserves the profile photo while removing stale managed photos", async () => {
  const env = createEnvironment("ios");
  env.addSource("file:///picker/profile-kept.jpg", "profile-image");
  const saved = await env.save({
    ...profile,
    bodyPhotoUri: "file:///picker/profile-kept.jpg",
  });
  const stalePhotoUri = "file:///app/documents/outfit/wardrobe/stale.jpg";
  env.files.set(stalePhotoUri, "orphaned-image");

  const reloaded = await env.reload();

  assert.equal(reloaded.profile.bodyPhotoUri, saved.bodyPhotoUri);
  assert.equal(env.files.get(saved.bodyPhotoUri), "profile-image");
  assert.equal(env.files.has(stalePhotoUri), false);
});
