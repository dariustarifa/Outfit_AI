import assert from "node:assert/strict";
import test from "node:test";
import { mergeProfileUpdate } from "./profile-update.ts";

const existingProfile = {
  name: "Alex",
  preferredName: "A",
  age: 30,
  heightCm: 170,
  bodyPhotoUri: "file:///profile.jpg",
  city: "Madrid",
  latitude: 40.4,
  longitude: -3.7,
  photoConsent: true,
};

test("profile edits preserve completed onboarding and unrelated saved profile data", () => {
  const updated = mergeProfileUpdate(
    { ...existingProfile, onboardingCompleted: true },
    { name: "Alex Rivera", city: "Sevilla", latitude: 37.4, longitude: -5.9 },
  );

  assert.equal(updated.name, "Alex Rivera");
  assert.equal(updated.city, "Sevilla");
  assert.equal(updated.onboardingCompleted, true);
  assert.equal(updated.photoConsent, true);
  assert.equal(updated.bodyPhotoUri, existingProfile.bodyPhotoUri);
  assert.equal(updated.age, existingProfile.age);
});

test("profile edits do not change onboarding progress for incomplete profiles", () => {
  const updated = mergeProfileUpdate(
    { ...existingProfile, onboardingCompleted: false },
    { age: 31 },
  );

  assert.equal(updated.age, 31);
  assert.equal(updated.onboardingCompleted, false);
});
