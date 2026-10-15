import type { OnboardingDraft, Profile } from "./types";

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type StartupScreen = "loading" | "onboarding" | "gender" | "home";
export type OnboardingSaveStage = "profile" | "draft";

export class OnboardingSaveError extends Error {
  readonly stage: OnboardingSaveStage;

  constructor(stage: OnboardingSaveStage, cause: unknown) {
    super(
      stage === "profile"
        ? "Could not save the onboarding profile."
        : "Could not save the onboarding draft.",
      { cause },
    );
    this.name = "OnboardingSaveError";
    this.stage = stage;
  }
}

export const ONBOARDING_PROFILE_SAVE_ERROR =
  "No se pudo guardar este paso. Inténtalo de nuevo.";
export const ONBOARDING_DRAFT_SAVE_ERROR =
  "No pudimos guardar tu progreso. Mantén la app abierta e inténtalo de nuevo.";

interface SaveOnboardingStepOptions {
  step: OnboardingStep;
  profile: Profile;
  draft: OnboardingDraft;
  saveProfile(profile: Profile): Promise<Profile | null>;
  saveDraft(draft: OnboardingDraft): Promise<void>;
  clearDraft(): Promise<void>;
}

interface SaveOnboardingStepResult {
  savedProfile: Profile | null;
  nextStep: OnboardingStep | null;
}

export async function saveOnboardingStep({
  step,
  profile,
  draft,
  saveProfile,
  saveDraft,
  clearDraft,
}: SaveOnboardingStepOptions): Promise<SaveOnboardingStepResult> {
  let savedProfile: Profile | null;
  try {
    savedProfile = await saveProfile({
      ...profile,
      onboardingCompleted: false,
    });
  } catch (cause) {
    throw new OnboardingSaveError("profile", cause);
  }

  if (step === 6) {
    try {
      await clearDraft();
    } catch (cause) {
      throw new OnboardingSaveError("draft", cause);
    }
    return { savedProfile, nextStep: null };
  }

  const nextStep = Math.min(step + 1, 6) as OnboardingStep;
  try {
    await saveDraft({
      ...draft,
      preferredName: savedProfile?.preferredName ?? draft.preferredName,
      bodyPhotoUri: savedProfile?.bodyPhotoUri ?? draft.bodyPhotoUri,
      step: nextStep,
    });
  } catch (cause) {
    throw new OnboardingSaveError("draft", cause);
  }

  return { savedProfile, nextStep };
}

export function getStartupScreen(
  loading: boolean,
  profile: Profile | null,
): StartupScreen {
  if (loading) return "loading";
  if (!profile?.onboardingCompleted) return "onboarding";
  return profile.gender ? "home" : "gender";
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
