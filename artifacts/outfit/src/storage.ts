import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { Profile, StoredAppData, WardrobeItem } from "./types";

const PROFILE_KEY = "outfit:profile:v1";
const WARDROBE_KEY = "outfit:wardrobe:v1";
const PHOTO_DIRECTORY_NAME = "outfit/wardrobe/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProfile(value: unknown): value is Profile {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    typeof value.age === "number" &&
    Number.isFinite(value.age) &&
    typeof value.heightCm === "number" &&
    Number.isFinite(value.heightCm) &&
    typeof value.bodyPhotoUri === "string" &&
    typeof value.city === "string" &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    typeof value.onboardingCompleted === "boolean"
  );
}

function isWardrobeItem(value: unknown): value is WardrobeItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.imageUri === "string" &&
    typeof value.note === "string" &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt)
  );
}

function parseJson(raw: string | null, label: string): unknown {
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Saved ${label} data is not valid JSON.`, { cause: error });
  }
}

export async function loadAppData(): Promise<StoredAppData> {
  const values = await AsyncStorage.multiGet([PROFILE_KEY, WARDROBE_KEY]);
  const stored = new Map(values);
  const parsedProfile = parseJson(stored.get(PROFILE_KEY) ?? null, "profile");
  const parsedWardrobe = parseJson(
    stored.get(WARDROBE_KEY) ?? null,
    "wardrobe",
  );

  if (parsedProfile !== null && !isProfile(parsedProfile)) {
    throw new Error("Saved profile data does not match the current app format.");
  }
  const wardrobeValue = parsedWardrobe ?? [];
  if (
    !Array.isArray(wardrobeValue) ||
    !wardrobeValue.every(isWardrobeItem)
  ) {
    throw new Error("Saved wardrobe data does not match the current app format.");
  }

  return {
    profile: parsedProfile,
    wardrobe: wardrobeValue as WardrobeItem[],
  };
}

export async function saveAppData(data: StoredAppData): Promise<void> {
  await AsyncStorage.multiSet([
    [PROFILE_KEY, JSON.stringify(data.profile)],
    [WARDROBE_KEY, JSON.stringify(data.wardrobe)],
  ]);
}

export async function copyImageToAppDocuments(sourceUri: string): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("The app document directory is unavailable.");
  }
  if (!sourceUri.trim()) {
    throw new Error("An image URI is required.");
  }

  const appPhotoDirectory = `${documentDirectory}${PHOTO_DIRECTORY_NAME}`;
  if (sourceUri.startsWith(appPhotoDirectory)) return sourceUri;

  const directoryInfo = await FileSystem.getInfoAsync(appPhotoDirectory);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(appPhotoDirectory, {
      intermediates: true,
    });
  }

  const pathWithoutQuery = sourceUri.split(/[?#]/, 1)[0] ?? sourceUri;
  const candidateExtension = pathWithoutQuery.split(".").pop()?.toLowerCase();
  const extension =
    candidateExtension && /^[a-z0-9]{1,8}$/.test(candidateExtension)
      ? candidateExtension
      : "jpg";
  const uniqueName = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${extension}`;
  const storedUri = `${appPhotoDirectory}${uniqueName}`;

  await FileSystem.copyAsync({ from: sourceUri, to: storedUri });
  const copiedFile = await FileSystem.getInfoAsync(storedUri);
  if (!copiedFile.exists) {
    throw new Error("The selected photo could not be copied into app storage.");
  }
  return storedUri;
}

export async function removeStoredImage(imageUri: string): Promise<void> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory || !imageUri.startsWith(`${documentDirectory}outfit/`)) {
    return;
  }

  const file = await FileSystem.getInfoAsync(imageUri);
  if (file.exists) {
    await FileSystem.deleteAsync(imageUri);
  }
}
