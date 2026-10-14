import type { Profile, ProfileUpdate } from "./types";

export function mergeProfileUpdate(
  profile: Profile,
  updates: ProfileUpdate,
): Profile {
  return {
    ...profile,
    ...updates,
    onboardingCompleted: profile.onboardingCompleted,
  };
}
