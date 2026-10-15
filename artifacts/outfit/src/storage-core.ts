import type {
  Profile,
  StoredAppData,
  WardrobeItem,
  WeatherSnapshot,
} from "./types";

interface AsyncKeyValueStorage {
  multiGet(
    keys: readonly string[],
  ): Promise<readonly (readonly [string, string | null])[]>;
  multiSet(entries: readonly (readonly [string, string])[]): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface ManagedFileSystem {
  documentDirectory: string | null;
  getInfoAsync(
    uri: string,
  ): Promise<{ exists: boolean; isDirectory?: boolean }>;
  readDirectoryAsync(uri: string): Promise<string[]>;
  makeDirectoryAsync(
    uri: string,
    options?: { intermediates?: boolean },
  ): Promise<void>;
  copyAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(uri: string): Promise<void>;
}

interface LocalStorageDependencies {
  asyncStorage: AsyncKeyValueStorage;
  fileSystem: ManagedFileSystem;
  platform: string;
  persistWebImage(sourceUri: string): Promise<string>;
}

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

export function createLocalStorage({
  asyncStorage,
  fileSystem,
  platform,
  persistWebImage,
}: LocalStorageDependencies) {
  async function readAppData(): Promise<StoredAppData> {
    const values = await asyncStorage.multiGet([PROFILE_KEY, WARDROBE_KEY]);
    const stored = new Map(values);
    const parsedProfile = parseJson(stored.get(PROFILE_KEY) ?? null, "profile");
    const parsedWardrobe = parseJson(
      stored.get(WARDROBE_KEY) ?? null,
      "wardrobe",
    );

    if (parsedProfile !== null && !isProfile(parsedProfile)) {
      throw new Error(
        "Saved profile data does not match the current app format.",
      );
    }
    const wardrobeValue = parsedWardrobe ?? [];
    if (!Array.isArray(wardrobeValue) || !wardrobeValue.every(isWardrobeItem)) {
      throw new Error(
        "Saved wardrobe data does not match the current app format.",
      );
    }

    return {
      profile: parsedProfile,
      wardrobe: wardrobeValue as WardrobeItem[],
    };
  }

  async function reconcileManagedPhotos(data: StoredAppData): Promise<void> {
    if (platform === "web" || !fileSystem.documentDirectory) return;

    const photoDirectory = `${fileSystem.documentDirectory}${PHOTO_DIRECTORY_NAME}`;
    const directoryInfo = await fileSystem.getInfoAsync(photoDirectory);
    if (!directoryInfo.exists) return;

    const referencedImages = new Set(
      [
        data.profile?.bodyPhotoUri,
        ...data.wardrobe.map((item) => item.imageUri),
      ].filter(
        (uri): uri is string => typeof uri === "string" && uri.length > 0,
      ),
    );
    const storedPhotos = await fileSystem.readDirectoryAsync(photoDirectory);

    for (const filename of storedPhotos) {
      const photoUri = `${photoDirectory}${filename}`;
      if (referencedImages.has(photoUri)) continue;

      const photoInfo = await fileSystem.getInfoAsync(photoUri);
      if (photoInfo.exists && !photoInfo.isDirectory) {
        await fileSystem.deleteAsync(photoUri);
      }
    }
  }

  async function loadAppData(): Promise<StoredAppData> {
    const data = await readAppData();
    await reconcileManagedPhotos(data);
    return data;
  }

  async function saveAppData(data: StoredAppData): Promise<void> {
    await asyncStorage.multiSet([
      [PROFILE_KEY, JSON.stringify(data.profile)],
      [WARDROBE_KEY, JSON.stringify(data.wardrobe)],
    ]);
  }

  async function loadWeatherSnapshot(): Promise<WeatherSnapshot | null> {
    const parsed = parseJson(
      await asyncStorage.getItem(WEATHER_KEY),
      "weather",
    );
    if (parsed === null) return null;
    if (!isWeatherSnapshot(parsed)) {
      throw new Error(
        "Saved weather data does not match the current app format.",
      );
    }
    return parsed;
  }

  async function saveWeatherSnapshot(
    weather: WeatherSnapshot | null,
  ): Promise<void> {
    if (weather === null) {
      await asyncStorage.removeItem(WEATHER_KEY);
      return;
    }
    await asyncStorage.setItem(WEATHER_KEY, JSON.stringify(weather));
  }

  async function copyImageToAppDocuments(sourceUri: string): Promise<string> {
    if (!sourceUri.trim()) {
      throw new Error("An image URI is required.");
    }

    if (platform === "web") {
      if (sourceUri.startsWith("data:image/jpeg;base64,")) return sourceUri;
      return persistWebImage(sourceUri);
    }

    const documentDirectory = fileSystem.documentDirectory;
    if (!documentDirectory) {
      throw new Error("The app document directory is unavailable.");
    }
    const appPhotoDirectory = `${documentDirectory}${PHOTO_DIRECTORY_NAME}`;
    if (sourceUri.startsWith(appPhotoDirectory)) return sourceUri;

    const directoryInfo = await fileSystem.getInfoAsync(appPhotoDirectory);
    if (!directoryInfo.exists) {
      await fileSystem.makeDirectoryAsync(appPhotoDirectory, {
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

    await fileSystem.copyAsync({ from: sourceUri, to: storedUri });
    const copiedFile = await fileSystem.getInfoAsync(storedUri);
    if (!copiedFile.exists) {
      throw new Error(
        "The selected photo could not be copied into app storage.",
      );
    }
    return storedUri;
  }

  async function removeStoredImage(imageUri: string): Promise<void> {
    const documentDirectory = fileSystem.documentDirectory;
    if (
      !documentDirectory ||
      !imageUri.startsWith(`${documentDirectory}outfit/`)
    ) {
      return;
    }

    const file = await fileSystem.getInfoAsync(imageUri);
    if (file.exists) {
      await fileSystem.deleteAsync(imageUri);
    }
  }

  async function removeUnreferencedStoredImage(
    imageUri: string,
  ): Promise<void> {
    const data = await readAppData();
    const isReferenced =
      data.profile?.bodyPhotoUri === imageUri ||
      data.wardrobe.some((item) => item.imageUri === imageUri);
    if (!isReferenced) {
      await removeStoredImage(imageUri);
    }
  }

  return {
    loadAppData,
    saveAppData,
    loadWeatherSnapshot,
    saveWeatherSnapshot,
    copyImageToAppDocuments,
    removeStoredImage,
    removeUnreferencedStoredImage,
  };
}
