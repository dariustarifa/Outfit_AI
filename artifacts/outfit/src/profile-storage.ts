import type { Profile, StoredAppData } from "./types";

interface ProfileStorageDependencies {
  copyImageToAppDocuments(sourceUri: string): Promise<string>;
  commit(data: StoredAppData): Promise<void>;
  removeStoredImage(imageUri: string): Promise<void>;
}

export async function saveProfileWithPhoto(
  nextProfile: Profile | null,
  currentData: StoredAppData,
  {
    copyImageToAppDocuments,
    commit,
    removeStoredImage,
  }: ProfileStorageDependencies,
): Promise<Profile | null> {
  const previousUri = currentData.profile?.bodyPhotoUri;
  const savedProfile =
    nextProfile?.bodyPhotoUri
      ? {
          ...nextProfile,
          bodyPhotoUri: await copyImageToAppDocuments(nextProfile.bodyPhotoUri),
        }
      : nextProfile;

  await commit({ ...currentData, profile: savedProfile });
  if (previousUri && previousUri !== savedProfile?.bodyPhotoUri) {
    await removeStoredImage(previousUri);
  }
  return savedProfile;
}
