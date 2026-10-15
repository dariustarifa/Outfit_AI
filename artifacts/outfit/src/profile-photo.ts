export type ProfilePhotoSource = "camera" | "gallery";

export type ProfilePhotoSelection =
  | { status: "selected"; uri: string }
  | { status: "cancelled" }
  | { status: "permission-denied" }
  | { status: "missing-uri" };

interface PhotoPermission {
  granted: boolean;
}

interface PickerResult {
  canceled: boolean;
  assets?: readonly { uri?: string }[] | null;
}

export async function selectProfilePhoto(
  permissionGranted: boolean | undefined,
  requestPermission: () => Promise<PhotoPermission>,
  launchPicker: () => Promise<PickerResult>,
): Promise<ProfilePhotoSelection> {
  const permission = permissionGranted
    ? { granted: true }
    : await requestPermission();
  if (!permission.granted) return { status: "permission-denied" };

  const result = await launchPicker();
  if (result.canceled) return { status: "cancelled" };

  const uri = result.assets?.[0]?.uri;
  return uri
    ? { status: "selected", uri }
    : { status: "missing-uri" };
}
