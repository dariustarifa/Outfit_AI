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

export async function updateAndSaveProfile(
  existingProfile: Profile | null,
  updates: ProfileUpdate,
  saveProfile: (profile: Profile) => Promise<Profile | null>,
): Promise<Profile> {
  if (!existingProfile) {
    throw new Error("Cannot update a profile that has not been created.");
  }

  const saved = await saveProfile(mergeProfileUpdate(existingProfile, updates));
  if (!saved) throw new Error("Could not save profile.");
  return saved;
}
