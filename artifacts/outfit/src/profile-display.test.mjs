import assert from "node:assert/strict";
import test from "node:test";
import { getProfileDisplay } from "./profile-display.ts";
import { updateAndSaveProfile } from "./profile-update.ts";

const originalProfile = {
  name: "Alex Rivera",
  preferredName: "Alex",
  gender: "female",
  age: 30,
  heightCm: 170,
  bodyPhotoUri: "file:///profile.jpg",
  city: "Madrid",
  latitude: 40.4,
  longitude: -3.7,
  photoConsent: true,
  onboardingCompleted: true,
};

test("saved profile edits refresh the home greeting and every profile detail", async () => {
  const savedProfile = await updateAndSaveProfile(
    originalProfile,
    {
      name: "Alexandra Rivera",
      preferredName: "Lex",
      age: 34,
      heightCm: 176,
      city: "Sevilla",
      latitude: 37.4,
      longitude: -5.9,
    },
    async (profile) => profile,
  );

  assert.deepEqual(getProfileDisplay(savedProfile), {
    greetingName: "Lex",
    name: "Alexandra Rivera",
    preferredName: "Lex",
    age: "34 años",
    height: "176 cm",
    city: "Sevilla",
  });
  assert.deepEqual(getProfileDisplay(originalProfile), {
    greetingName: "Alex",
    name: "Alex Rivera",
    preferredName: "Alex",
    age: "30 años",
    height: "170 cm",
    city: "Madrid",
  });
});

test("the home greeting falls back to the updated name when no preferred name is set", () => {
  assert.equal(
    getProfileDisplay({ ...originalProfile, name: "Nora Sol", preferredName: "" })
      .greetingName,
    "Nora",
  );
});
