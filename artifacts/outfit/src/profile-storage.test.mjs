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
  const resizeCalls = [];
  let nextResizedPhotoId = 0;
  let failNextMetadataWrite = false;
  let failNextDelete = false;
  let failAfterMetadataWrite = false;
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
      if (
        failNextDelete &&
        uri.startsWith("file:///app/documents/outfit/")
      ) {
        failNextDelete = false;
        throw new Error("Photo cleanup failed.");
      }
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
    async resizeProfilePhoto(sourceUri, maxDimension) {
      resizeCalls.push({ sourceUri, maxDimension });
      if (!files.has(sourceUri)) {
        throw new Error(`Missing source image: ${sourceUri}`);
      }
      const resizedUri = `file:///cache/profile-photo-${++nextResizedPhotoId}.jpg`;
      files.set(
        resizedUri,
        `${files.get(sourceUri)}:resized-to-${maxDimension}`,
      );
      return resizedUri;
    },
  });
  let currentData = { profile: null, wardrobe: [] };
  const dependencies = {
    copyProfilePhotoToAppDocuments: storage.copyProfilePhotoToAppDocuments,
    async commit(next) {
      if (failNextMetadataWrite) {
        failNextMetadataWrite = false;
        throw new Error("Profile metadata write failed.");
      }
      await storage.saveAppData(next);
      currentData = next;
      if (failAfterMetadataWrite) {
        failAfterMetadataWrite = false;
        throw new Error("Profile metadata write reported a failure.");
      }
    },
    removeStoredImage: storage.removeStoredImage,
    removeUnreferencedStoredImage: storage.removeUnreferencedStoredImage,
  };

  return {
    files,
    fileSystem,
    resizeCalls,
    save: (nextProfile) =>
      saveProfileWithPhoto(nextProfile, currentData, dependencies),
    async reload() {
      currentData = await storage.loadAppData();
      return currentData;
    },
    addSource(uri, contents) {
      files.set(uri, contents);
    },
    failNextMetadataWrite() {
      failNextMetadataWrite = true;
    },
    failNextDelete() {
      failNextDelete = true;
    },
    failAfterMetadataWrite() {
      failAfterMetadataWrite = true;
    },
    saveDraft: storage.saveOnboardingDraft,
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
        `${platform}-${source}-image-bytes:resized-to-1280`,
      );
      assert.equal(saved.onboardingCompleted, false);
      assert.deepEqual(env.resizeCalls, [
        { sourceUri, maxDimension: 1280 },
      ]);
      assert.equal(
        [...env.files.keys()].some((uri) => uri.startsWith("file:///cache/")),
        false,
      );

      const reloaded = await env.reload();
      assert.equal(reloaded.profile.bodyPhotoUri, saved.bodyPhotoUri);
      assert.equal(
        env.files.get(reloaded.profile.bodyPhotoUri),
        `${platform}-${source}-image-bytes:resized-to-1280`,
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

test("a failed profile metadata save immediately removes its unreferenced new photo", async () => {
  const env = createEnvironment("ios");
  const sourceUri = "file:///picker/profile-photo.jpg";
  env.addSource(sourceUri, "profile-image");
  env.failNextMetadataWrite();

  await assert.rejects(
    env.save({ ...profile, bodyPhotoUri: sourceUri }),
    /Profile metadata write failed/,
  );

  assert.deepEqual([...env.files.keys()], [sourceUri]);
  assert.equal((await env.reload()).profile, null);
});

test("a failed photo cleanup is retried safely during the next load", async () => {
  const env = createEnvironment("ios");
  const sourceUri = "file:///picker/profile-photo.jpg";
  env.addSource(sourceUri, "profile-image");
  env.failNextMetadataWrite();
  env.failNextDelete();

  await assert.rejects(
    env.save({ ...profile, bodyPhotoUri: sourceUri }),
    (error) =>
      error instanceof AggregateError &&
      /Profile metadata write failed/.test(error.errors[0].message) &&
      /Photo cleanup failed/.test(error.errors[1].message),
  );

  const orphanedPhoto = [...env.files.keys()].find((uri) =>
    uri.startsWith("file:///app/documents/outfit/wardrobe/"),
  );
  assert.ok(orphanedPhoto);
  assert.equal((await env.reload()).profile, null);
  assert.equal(env.files.has(orphanedPhoto), false);
});

test("a failed photo replacement keeps the previously saved photo", async () => {
  const env = createEnvironment("ios");
  const oldSourceUri = "file:///picker/old-profile-photo.jpg";
  const nextSourceUri = "file:///picker/new-profile-photo.jpg";
  env.addSource(oldSourceUri, "old-profile-image");
  env.addSource(nextSourceUri, "new-profile-image");
  const previousProfile = await env.save({
    ...profile,
    bodyPhotoUri: oldSourceUri,
  });
  env.failNextMetadataWrite();

  await assert.rejects(
    env.save({ ...profile, bodyPhotoUri: nextSourceUri }),
    /Profile metadata write failed/,
  );

  assert.equal(
    env.files.get(previousProfile.bodyPhotoUri),
    "old-profile-image:resized-to-1280",
  );
  assert.equal(
    [...env.files.keys()].filter((uri) =>
      uri.startsWith("file:///app/documents/outfit/wardrobe/"),
    ).length,
    1,
  );
  assert.equal(
    (await env.reload()).profile.bodyPhotoUri,
    previousProfile.bodyPhotoUri,
  );
});

test("failed save cleanup preserves a photo referenced by an onboarding draft", async () => {
  const env = createEnvironment("ios");
  const managedPhotoUri =
    "file:///app/documents/outfit/wardrobe/onboarding-photo.jpg";
  env.files.set(managedPhotoUri, "draft-profile-image");
  await env.saveDraft({
    name: "Ada Lovelace",
    preferredName: "Ada",
    age: "36",
    heightCm: "168",
    city: "London",
    bodyPhotoUri: managedPhotoUri,
    photoConsent: true,
    step: 4,
    selectedCity: {
      name: "London",
      latitude: 51.5072,
      longitude: -0.1276,
    },
  });
  env.failNextMetadataWrite();

  await assert.rejects(
    env.save({ ...profile, bodyPhotoUri: managedPhotoUri }),
    /Profile metadata write failed/,
  );

  assert.equal(env.files.get(managedPhotoUri), "draft-profile-image");
});

test("failed save cleanup preserves a photo when metadata references it", async () => {
  const env = createEnvironment("ios");
  const sourceUri = "file:///picker/profile-photo.jpg";
  env.addSource(sourceUri, "profile-image");
  env.failAfterMetadataWrite();

  await assert.rejects(
    env.save({ ...profile, bodyPhotoUri: sourceUri }),
    /Profile metadata write reported a failure/,
  );

  const reloaded = await env.reload();
  assert.ok(reloaded.profile.bodyPhotoUri);
  assert.equal(
    env.files.get(reloaded.profile.bodyPhotoUri),
    "profile-image:resized-to-1280",
  );
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
  assert.equal(
    env.files.get(saved.bodyPhotoUri),
    "profile-image:resized-to-1280",
  );
  assert.equal(env.files.has(stalePhotoUri), false);
});
