import type { Profile } from "./types";

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type StartupScreen = "loading" | "onboarding" | "home";

export function getStartupScreen(
  loading: boolean,
  profile: Profile | null,
): StartupScreen {
  if (loading) return "loading";
  return profile?.onboardingCompleted ? "home" : "onboarding";
}

export function getInitialOnboardingStep(
  profile: Profile | null,
): OnboardingStep {
  if (!profile || !profile.name.trim()) return 0;
  if (!profile.preferredName?.trim()) return 1;
  if (!Number.isInteger(profile.age) || profile.age < 14 || profile.age > 99) {
    return 2;
  }
  if (
    !Number.isInteger(profile.heightCm) ||
    profile.heightCm < 100 ||
    profile.heightCm > 230
  ) {
    return 3;
  }
  if (
    !profile.city.trim() ||
    !Number.isFinite(profile.latitude) ||
    !Number.isFinite(profile.longitude)
  ) {
    return 4;
  }
  if (!profile.photoConsent) return 5;
  return 6;
}
