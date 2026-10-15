import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialOnboardingStep,
  getStartupScreen,
} from "./onboarding-progress.ts";
import { createLocalStorage } from "./storage-core.ts";

const readyProfile = {
  name: "Ada Lovelace",
  preferredName: "Ada",
  gender: "female",
  age: 36,
  heightCm: 168,
  bodyPhotoUri: "file:///profile.jpg",
  city: "London",
  latitude: 51.5072,
  longitude: -0.1276,
  photoConsent: true,
  onboardingCompleted: false,
};

test("a missing profile starts at the first setup step", () => {
  assert.equal(getInitialOnboardingStep(null), 0);
  assert.equal(getStartupScreen(false, null), "onboarding");
});

test("an incomplete profile resumes at its first missing field", () => {
  const missingFieldCases = [
    [{ ...readyProfile, name: " " }, 0],
    [{ ...readyProfile, preferredName: "" }, 1],
    [{ ...readyProfile, age: 0 }, 2],
    [{ ...readyProfile, heightCm: 0 }, 3],
    [
      { ...readyProfile, city: "", latitude: undefined, longitude: undefined },
      4,
    ],
    [{ ...readyProfile, photoConsent: false }, 5],
    [{ ...readyProfile, bodyPhotoUri: "" }, 6],
  ];

  for (const [profile, expectedStep] of missingFieldCases) {
    assert.equal(getInitialOnboardingStep(profile), expectedStep);
  }
  assert.equal(getStartupScreen(false, readyProfile), "onboarding");
});

test("a completed profile opens home after startup loading finishes", () => {
  assert.equal(
    getStartupScreen(false, { ...readyProfile, onboardingCompleted: true }),
    "home",
  );
  assert.equal(
    getStartupScreen(true, { ...readyProfile, onboardingCompleted: true }),
    "loading",
  );
});

test("a completed legacy profile without gender is sent to the gender step", () => {
  const { gender: _gender, ...legacyProfile } = readyProfile;
  const completedLegacyProfile = {
    ...legacyProfile,
    onboardingCompleted: true,
  };

  assert.equal(getStartupScreen(false, completedLegacyProfile), "gender");
  assert.equal(getStartupScreen(true, completedLegacyProfile), "loading");
});

test("profile drafts remain in AsyncStorage when the app storage is reloaded", async () => {
  const values = new Map();
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
  const createAppStorage = () =>
    createLocalStorage({
      asyncStorage,
      fileSystem: {
        documentDirectory: "file:///app/documents/",
        async getInfoAsync() {
          return { exists: false };
        },
        async readDirectoryAsync() {
          return [];
        },
        async makeDirectoryAsync() {},
        async copyAsync() {},
        async deleteAsync() {},
      },
      platform: "ios",
      persistWebImage: async () => {
        throw new Error("Web image persistence is not used in this test.");
      },
    });
  const draft = {
    name: "Ada Lovelace",
    preferredName: "Ada",
    age: 0,
    heightCm: 0,
    bodyPhotoUri: "",
    city: "",
    photoConsent: false,
    onboardingCompleted: false,
  };

  await createAppStorage().saveAppData({ profile: draft, wardrobe: [] });
  const reloaded = await createAppStorage().loadAppData();

  assert.deepEqual(reloaded.profile, draft);
  assert.equal(values.get("outfit:profile:v1"), JSON.stringify(draft));

  const { gender: _gender, ...legacyProfile } = readyProfile;
  const completedLegacyProfile = {
    ...legacyProfile,
    onboardingCompleted: true,
  };
  await createAppStorage().saveAppData({
    profile: completedLegacyProfile,
    wardrobe: [],
  });
  const reloadedLegacyProfile = await createAppStorage().loadAppData();

  assert.deepEqual(reloadedLegacyProfile.profile, completedLegacyProfile);
  assert.equal("gender" in reloadedLegacyProfile.profile, false);

  const profileWithGender = {
    ...completedLegacyProfile,
    gender: "nonbinary",
  };
  await createAppStorage().saveAppData({
    profile: profileWithGender,
    wardrobe: [],
  });
  const reloadedProfileWithGender = await createAppStorage().loadAppData();

  assert.deepEqual(reloadedProfileWithGender.profile, profileWithGender);
});
