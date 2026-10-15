import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialOnboardingStep,
  getStartupScreen,
  ONBOARDING_DRAFT_SAVE_ERROR,
  ONBOARDING_PROFILE_SAVE_ERROR,
  OnboardingSaveError,
  saveOnboardingStep,
} from "./onboarding-progress.ts";
import { saveProfileWithPhoto } from "./profile-storage.ts";
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
      resizeProfilePhoto: async (uri) => uri,
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

test("a failed profile save keeps onboarding on the same step and can be retried", async () => {
  const values = new Map();
  let failNextProfileSave = true;
  const asyncStorage = {
    async multiGet(keys) {
      return keys.map((key) => [key, values.get(key) ?? null]);
    },
    async multiSet(entries) {
      if (failNextProfileSave) {
        failNextProfileSave = false;
        throw new Error("Simulated profile storage failure.");
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
  const storage = createLocalStorage({
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
    resizeProfilePhoto: async (uri) => uri,
  });
  let currentData = { profile: null, wardrobe: [] };
  const persistProfile = (nextProfile) =>
    saveProfileWithPhoto(nextProfile, currentData, {
      copyProfilePhotoToAppDocuments: storage.copyProfilePhotoToAppDocuments,
      async commit(nextData) {
        await storage.saveAppData(nextData);
        currentData = nextData;
      },
      removeStoredImage: storage.removeStoredImage,
      removeUnreferencedStoredImage: storage.removeUnreferencedStoredImage,
    });
  const draft = {
    name: "Ada Lovelace",
    preferredName: "Ada",
    age: "36",
    heightCm: "168",
    bodyPhotoUri: "",
    city: "London",
    photoConsent: true,
    step: 2,
    selectedCity: {
      name: "London",
      latitude: 51.5072,
      longitude: -0.1276,
    },
  };
  const profileToSave = {
    ...readyProfile,
    bodyPhotoUri: "",
    onboardingCompleted: true,
  };
  let currentStep = 2;
  const attemptSave = async () => {
    const result = await saveOnboardingStep({
      step: currentStep,
      profile: profileToSave,
      draft,
      saveProfile: persistProfile,
      saveDraft: storage.saveOnboardingDraft,
      clearDraft: storage.clearOnboardingDraft,
    });
    if (result.nextStep !== null) currentStep = result.nextStep;
    return result;
  };

  await assert.rejects(
    attemptSave,
    (error) =>
      error instanceof OnboardingSaveError && error.stage === "profile",
  );
  assert.equal(currentStep, 2);
  assert.equal(
    ONBOARDING_PROFILE_SAVE_ERROR,
    "No se pudo guardar este paso. Inténtalo de nuevo.",
  );
  assert.equal((await storage.loadAppData()).profile, null);
  assert.equal(await storage.loadOnboardingDraft(), null);

  const retry = await attemptSave();

  assert.equal(retry.nextStep, 3);
  assert.equal(currentStep, 3);
  assert.equal(currentData.profile.onboardingCompleted, false);
  const reloaded = await storage.loadAppData();
  assert.equal(reloaded.profile.onboardingCompleted, false);
  assert.equal((await storage.loadOnboardingDraft()).step, 3);
});

test("a failed progress-draft write keeps the current setup step and can be retried", async () => {
  let failNextDraftSave = true;
  let savedProfile = null;
  let savedDraft = null;
  let currentStep = 2;
  let visibleError = "";
  const profileToSave = {
    ...readyProfile,
    onboardingCompleted: false,
  };
  const draft = {
    name: "Ada Lovelace",
    preferredName: "Ada",
    age: "36",
    heightCm: "168",
    bodyPhotoUri: "",
    city: "London",
    photoConsent: true,
    step: 2,
    selectedCity: {
      name: "London",
      latitude: 51.5072,
      longitude: -0.1276,
    },
  };
  const attemptSave = async () => {
    try {
      const result = await saveOnboardingStep({
        step: currentStep,
        profile: profileToSave,
        draft,
        async saveProfile(profile) {
          savedProfile = profile;
          return profile;
        },
        async saveDraft(nextDraft) {
          if (failNextDraftSave) {
            failNextDraftSave = false;
            throw new Error("Simulated onboarding draft storage failure.");
          }
          savedDraft = nextDraft;
        },
        async clearDraft() {},
      });
      if (result.nextStep !== null) currentStep = result.nextStep;
      visibleError = "";
      return result;
    } catch (error) {
      if (error instanceof OnboardingSaveError && error.stage === "draft") {
        visibleError = ONBOARDING_DRAFT_SAVE_ERROR;
      }
      throw error;
    }
  };

  await assert.rejects(
    attemptSave,
    (error) =>
      error instanceof OnboardingSaveError && error.stage === "draft",
  );
  assert.equal(savedProfile.onboardingCompleted, false);
  assert.equal(currentStep, 2);
  assert.equal(savedDraft, null);
  assert.equal(visibleError, ONBOARDING_DRAFT_SAVE_ERROR);

  const retry = await attemptSave();

  assert.equal(retry.nextStep, 3);
  assert.equal(currentStep, 3);
  assert.equal(savedDraft.step, 3);
  assert.equal(visibleError, "");
});

test("a failed final draft clear keeps setup open and retries successfully", async () => {
  let failNextClear = true;
  let savedProfile = null;
  let savedDraft = {
    name: "Ada Lovelace",
    preferredName: "Ada",
    age: "36",
    heightCm: "168",
    bodyPhotoUri: "file:///profile.jpg",
    city: "London",
    photoConsent: true,
    step: 6,
  };
  let currentStep = 6;
  let currentRoute = "onboarding";
  let visibleError = "";
  const draft = savedDraft;
  const attemptSave = async () => {
    try {
      const result = await saveOnboardingStep({
        step: currentStep,
        profile: { ...readyProfile, onboardingCompleted: true },
        draft,
        async saveProfile(profile) {
          savedProfile = profile;
          return profile;
        },
        async saveDraft() {
          throw new Error("The final setup step must not save a next draft.");
        },
        async clearDraft() {
          if (failNextClear) {
            failNextClear = false;
            throw new Error("Simulated onboarding draft cleanup failure.");
          }
          savedDraft = null;
        },
      });

      if (result.nextStep === null) {
        currentRoute = "onboarding/intro";
      } else {
        currentStep = result.nextStep;
      }
      visibleError = "";
      return result;
    } catch (error) {
      if (error instanceof OnboardingSaveError && error.stage === "draft") {
        visibleError = ONBOARDING_DRAFT_SAVE_ERROR;
      }
      throw error;
    }
  };

  await assert.rejects(
    attemptSave,
    (error) =>
      error instanceof OnboardingSaveError && error.stage === "draft",
  );
  assert.equal(currentRoute, "onboarding");
  assert.equal(currentStep, 6);
  assert.equal(savedProfile.onboardingCompleted, false);
  assert.equal(savedDraft, draft);
  assert.equal(visibleError, ONBOARDING_DRAFT_SAVE_ERROR);

  const retry = await attemptSave();

  assert.equal(retry.nextStep, null);
  assert.equal(currentRoute, "onboarding/intro");
  assert.equal(currentStep, 6);
  assert.equal(savedProfile.onboardingCompleted, false);
  assert.equal(savedDraft, null);
  assert.equal(visibleError, "");
});
