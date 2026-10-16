import assert from "node:assert/strict";
import test from "node:test";
import { createAppDataCommitter } from "./app-data-commit.ts";
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
  let failManagedPhotoDeletes = false;
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
      if (
        (failNextDelete || failManagedPhotoDeletes) &&
        uri.startsWith("file:///app/documents/outfit/")
      ) {
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
      resizeProfilePhoto: async (uri) => uri,
      onManagedPhotoCleanupError(uri, error) {
        errors.push(new Error(`${uri}: ${error.message}`));
      },
    });
  let storage = createStorage();

  let currentData = { profile: null, wardrobe: [] };
  const commitData = createAppDataCommitter({
    getData: () => currentData,
    saveData: (next) => storage.saveAppData(next),
    onCommit(next) {
      currentData = next;
    },
  });
  async function saveProfile(profile) {
    return saveProfileWithPhoto(profile, {
      copyProfilePhotoToAppDocuments: storage.copyProfilePhotoToAppDocuments,
      commitProfile: (nextProfile) =>
        commitData((current) => ({
          next: { ...current, profile: nextProfile },
          result: current.profile,
        })),
      removeStoredImage: storage.removeStoredImage,
      removeUnreferencedStoredImage: storage.removeUnreferencedStoredImage,
    });
  }
  const actions = createWardrobeActions({
    getData: () => currentData,
    commitWardrobe: (wardrobe) =>
      commitData((current) => ({
        next: { ...current, wardrobe },
        result: undefined,
      })),
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
    getProfile() {
      return currentData.profile;
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
    failManagedPhotoDeletes(value) {
      failManagedPhotoDeletes = value;
    },
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createOverlappingSaveEnvironment({ failFirstWrite = false } = {}) {
  const initialProfile = {
    name: "Before",
    bodyPhotoUri: "",
    onboardingCompleted: true,
  };
  let currentData = { profile: initialProfile, wardrobe: [] };
  let writeCount = 0;
  const firstWriteStarted = createDeferred();
  const releaseFirstWrite = createDeferred();
  const commitData = createAppDataCommitter({
    getData: () => currentData,
    async saveData() {
      writeCount += 1;
      if (writeCount === 1) {
        firstWriteStarted.resolve();
        await releaseFirstWrite.promise;
        if (failFirstWrite) throw new Error("First commit failed.");
      }
    },
    onCommit(next) {
      currentData = next;
    },
  });
  const saveProfile = (profile) =>
    saveProfileWithPhoto(profile, {
      copyProfilePhotoToAppDocuments: async (uri) => uri,
      commitProfile: (nextProfile) =>
        commitData((current) => ({
          next: { ...current, profile: nextProfile },
          result: current.profile,
        })),
      removeStoredImage: async () => {},
      removeUnreferencedStoredImage: async () => {},
    });
  const actions = createWardrobeActions({
    getData: () => currentData,
    commitWardrobe: (wardrobe) =>
      commitData((current) => ({
        next: { ...current, wardrobe },
        result: undefined,
      })),
    copyImageToAppDocuments: async (uri) => uri,
    removeStoredImage: async () => {},
    removeUnreferencedStoredImage: async () => {},
    onError() {},
  });

  return {
    actions,
    firstWriteStarted: firstWriteStarted.promise,
    getData: () => currentData,
    releaseFirstWrite: () => releaseFirstWrite.resolve(),
    saveProfile,
  };
}

function createControlledWardrobeActions({
  initialWardrobe = [],
  failFirstCommit = false,
} = {}) {
  let currentData = { profile: null, wardrobe: initialWardrobe };
  let commitCount = 0;
  const firstCommitStarted = createDeferred();
  const releaseFirstCommit = createDeferred();
  const errors = [];
  const actions = createWardrobeActions({
    getData: () => currentData,
    async commitWardrobe(wardrobe) {
      commitCount += 1;
      if (commitCount === 1) {
        firstCommitStarted.resolve();
        await releaseFirstCommit.promise;
        if (failFirstCommit) throw new Error("First commit failed.");
      }
      currentData = { ...currentData, wardrobe };
    },
    copyImageToAppDocuments: async (uri) => uri,
    removeStoredImage: async () => {},
    removeUnreferencedStoredImage: async () => {},
    onError(error) {
      errors.push(error);
    },
  });

  return {
    actions,
    errors,
    getData: () => currentData,
    firstCommitStarted: firstCommitStarted.promise,
    releaseFirstCommit: () => releaseFirstCommit.resolve(),
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

test("a failed completed-profile edit keeps the saved profile unchanged and can be retried", async () => {
  const env = createTestEnvironment();
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
  env.failNextMetadataWrite();

  await assert.rejects(
    env.updateProfile({ name: "Alex Rivera", age: 34 }),
    /Metadata persistence failed/,
  );

  assert.deepEqual(env.getProfile(), originalProfile);
  assert.deepEqual((await env.reload()).profile, originalProfile);

  const saved = await env.updateProfile({ name: "Alex Rivera", age: 34 });
  assert.deepEqual(saved, {
    ...originalProfile,
    name: "Alex Rivera",
    age: 34,
  });
  assert.deepEqual((await env.reload()).profile, saved);
});

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

test("overlapping wardrobe additions retain both items", async () => {
  const env = createControlledWardrobeActions();
  const firstAdd = env.actions.addItem({
    imageUri: "file:///picker/first.jpg",
    note: "First",
  });
  await env.firstCommitStarted;

  const secondAdd = env.actions.addItem({
    imageUri: "file:///picker/second.jpg",
    note: "Second",
  });
  env.releaseFirstCommit();
  await Promise.all([firstAdd, secondAdd]);

  assert.deepEqual(
    env.getData().wardrobe.map((item) => item.note),
    ["First", "Second"],
  );
});

test("overlapping profile then wardrobe saves retain both changes", async () => {
  const env = createOverlappingSaveEnvironment();
  const profileSave = env.saveProfile({
    ...env.getData().profile,
    name: "Profile saved",
  });
  await env.firstWriteStarted;
  const wardrobeSave = env.actions.addItem({
    imageUri: "file:///picker/new-item.jpg",
    note: "Wardrobe saved",
  });

  env.releaseFirstWrite();
  await Promise.all([profileSave, wardrobeSave]);

  assert.equal(env.getData().profile.name, "Profile saved");
  assert.deepEqual(env.getData().wardrobe.map((item) => item.note), [
    "Wardrobe saved",
  ]);
});

test("overlapping wardrobe then profile saves retain both changes", async () => {
  const env = createOverlappingSaveEnvironment();
  const wardrobeSave = env.actions.addItem({
    imageUri: "file:///picker/new-item.jpg",
    note: "Wardrobe saved",
  });
  await env.firstWriteStarted;
  const profileSave = env.saveProfile({
    ...env.getData().profile,
    name: "Profile saved",
  });

  env.releaseFirstWrite();
  await Promise.all([wardrobeSave, profileSave]);

  assert.equal(env.getData().profile.name, "Profile saved");
  assert.deepEqual(env.getData().wardrobe.map((item) => item.note), [
    "Wardrobe saved",
  ]);
});

test("a failed profile write does not block an overlapping wardrobe save", async () => {
  const env = createOverlappingSaveEnvironment({ failFirstWrite: true });
  const profileSave = env.saveProfile({
    ...env.getData().profile,
    name: "Unsaved profile",
  });
  await env.firstWriteStarted;
  const wardrobeSave = env.actions.addItem({
    imageUri: "file:///picker/new-item.jpg",
    note: "Wardrobe saved",
  });

  env.releaseFirstWrite();
  await assert.rejects(profileSave, /First commit failed/);
  await wardrobeSave;

  assert.equal(env.getData().profile.name, "Before");
  assert.deepEqual(env.getData().wardrobe.map((item) => item.note), [
    "Wardrobe saved",
  ]);
});

test("an overlapping edit and delete both remain saved", async () => {
  const env = createControlledWardrobeActions({
    initialWardrobe: [
      { id: "first", imageUri: "first.jpg", note: "Old note", createdAt: 1 },
      { id: "second", imageUri: "second.jpg", note: "Keep", createdAt: 2 },
    ],
  });
  const edit = env.actions.updateItem("first", { note: "Updated note" });
  await env.firstCommitStarted;

  const deletion = env.actions.removeItem("second");
  env.releaseFirstCommit();
  await Promise.all([edit, deletion]);

  assert.deepEqual(env.getData().wardrobe, [
    { id: "first", imageUri: "first.jpg", note: "Updated note", createdAt: 1 },
  ]);
});

test("a failed wardrobe mutation does not block the next queued mutation", async () => {
  const env = createControlledWardrobeActions({ failFirstCommit: true });
  const failedAdd = env.actions.addItem({
    imageUri: "file:///picker/fails.jpg",
    note: "Failed",
  });
  await env.firstCommitStarted;

  const successfulAdd = env.actions.addItem({
    imageUri: "file:///picker/succeeds.jpg",
    note: "Saved",
  });
  env.releaseFirstCommit();
  const [failedResult, successfulResult] = await Promise.allSettled([
    failedAdd,
    successfulAdd,
  ]);

  assert.equal(failedResult.status, "rejected");
  assert.equal(successfulResult.status, "fulfilled");
  assert.deepEqual(
    env.getData().wardrobe.map((item) => item.note),
    ["Saved"],
  );
  assert.equal(env.errors.length, 1);
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

test("saved data loads during repeated orphan cleanup failures and retries later", async () => {
  const env = createTestEnvironment();
  const profile = {
    name: "Avery",
    preferredName: "",
    gender: "other",
    age: 30,
    heightCm: 170,
    bodyPhotoUri: "",
    city: "Portland",
    photoConsent: false,
    onboardingCompleted: true,
  };
  await env.seedProfile(profile);
  env.setSourcePhoto("file:///picker/original.jpg", "original-image");
  env.setSourcePhoto("file:///picker/replacement.jpg", "replacement-image");
  const item = await env.actions.addItem({
    imageUri: "file:///picker/original.jpg",
    note: "Coat",
  });

  env.failManagedPhotoDeletes(true);
  await assert.rejects(
    env.actions.updateItem(item.id, {
      imageUri: "file:///picker/replacement.jpg",
    }),
    /Photo cleanup failed/,
  );

  const replacementUri = env.files.has(item.imageUri)
    ? [...env.files.keys()].find(
        (uri) =>
          uri.startsWith("file:///app/documents/outfit/wardrobe/") &&
          uri !== item.imageUri,
      )
    : undefined;
  assert.ok(replacementUri);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const loaded = await env.reload();
    assert.deepEqual(loaded.profile, profile);
    assert.equal(loaded.wardrobe[0].imageUri, replacementUri);
    assert.equal(env.files.has(item.imageUri), true);
  }
  assert.equal(
    env.errors.filter((error) => error.message.includes(item.imageUri)).length,
    2,
  );

  env.failManagedPhotoDeletes(false);
  const recovered = await env.reload();
  assert.deepEqual(recovered.profile, profile);
  assert.equal(recovered.wardrobe[0].imageUri, replacementUri);
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
