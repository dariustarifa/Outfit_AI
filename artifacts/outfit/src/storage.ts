import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import type {
  Profile,
  StoredAppData,
  WardrobeItem,
  WeatherSnapshot,
} from "./types";

const PROFILE_KEY = "outfit:profile:v1";
const WARDROBE_KEY = "outfit:wardrobe:v1";
const WEATHER_KEY = "outfit:weather:v1";
const PHOTO_DIRECTORY_NAME = "outfit/wardrobe/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProfile(value: unknown): value is Profile {
  if (!isRecord(value)) return false;

  const hasCoordinates =
    value.latitude !== undefined || value.longitude !== undefined;
  const hasValidCoordinates =
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude);

  return (
    typeof value.name === "string" &&
    (value.preferredName === undefined ||
      typeof value.preferredName === "string") &&
    typeof value.age === "number" &&
    Number.isFinite(value.age) &&
    typeof value.heightCm === "number" &&
    Number.isFinite(value.heightCm) &&
    typeof value.bodyPhotoUri === "string" &&
    typeof value.city === "string" &&
    (value.photoConsent === undefined ||
      typeof value.photoConsent === "boolean") &&
    (!hasCoordinates || hasValidCoordinates) &&
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

function isWeatherSnapshot(value: unknown): value is WeatherSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.temperatureC === "number" &&
    Number.isFinite(value.temperatureC) &&
    typeof value.condition === "string" &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt) &&
    typeof value.minTemperatureC === "number" &&
    Number.isFinite(value.minTemperatureC) &&
    typeof value.maxTemperatureC === "number" &&
    Number.isFinite(value.maxTemperatureC) &&
    typeof value.precipitationProbability === "number" &&
    Number.isFinite(value.precipitationProbability)
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

async function persistWebImage(sourceUri: string): Promise<string> {
  const image = document.createElement("img");
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The selected image could not be read."));
  });
  image.src = sourceUri;
  await loaded;

  const maxDimension = 1280;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image compression is unavailable.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("The selected image could not be compressed.")),
      "image/jpeg",
      0.78,
    );
  });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The selected image could not be saved."));
    reader.onerror = () => reject(new Error("The selected image could not be saved."));
    reader.readAsDataURL(blob);
  });
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

export async function loadWeatherSnapshot(): Promise<WeatherSnapshot | null> {
  const parsed = parseJson(await AsyncStorage.getItem(WEATHER_KEY), "weather");
  if (parsed === null) return null;
  if (!isWeatherSnapshot(parsed)) {
    throw new Error("Saved weather data does not match the current app format.");
  }
  return parsed;
}

export async function saveWeatherSnapshot(
  weather: WeatherSnapshot | null,
): Promise<void> {
  if (weather === null) {
    await AsyncStorage.removeItem(WEATHER_KEY);
    return;
  }
  await AsyncStorage.setItem(WEATHER_KEY, JSON.stringify(weather));
}

export async function copyImageToAppDocuments(sourceUri: string): Promise<string> {
  if (!sourceUri.trim()) {
    throw new Error("An image URI is required.");
  }

  if (Platform.OS === "web") {
    if (sourceUri.startsWith("data:image/jpeg;base64,")) return sourceUri;
    return persistWebImage(sourceUri);
  }

  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("The app document directory is unavailable.");
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
