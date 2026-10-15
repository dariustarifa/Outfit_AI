import type { Profile, StoredAppData } from "./types";

interface ProfileStorageDependencies {
  copyImageToAppDocuments(sourceUri: string): Promise<string>;
  commit(data: StoredAppData): Promise<void>;
  removeStoredImage(imageUri: string): Promise<void>;
  removeUnreferencedStoredImage(imageUri: string): Promise<void>;
}

export async function saveProfileWithPhoto(
  nextProfile: Profile | null,
  currentData: StoredAppData,
  {
    copyImageToAppDocuments,
    commit,
    removeStoredImage,
    removeUnreferencedStoredImage,
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

  try {
    await commit({ ...currentData, profile: savedProfile });
  } catch (commitError) {
    const newPhotoUri = savedProfile?.bodyPhotoUri;
    if (newPhotoUri) {
      try {
        await removeUnreferencedStoredImage(newPhotoUri);
      } catch (cleanupError) {
        throw new AggregateError(
          [commitError, cleanupError],
          "The profile could not be saved, and its new photo could not be cleaned up.",
          { cause: commitError },
        );
      }
    }
    throw commitError;
  }

  if (previousUri && previousUri !== savedProfile?.bodyPhotoUri) {
    await removeStoredImage(previousUri);
  }
  return savedProfile;
}
