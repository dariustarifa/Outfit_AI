import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { createLocalStorage } from "./storage-core";

async function persistWebImage(sourceUri: string): Promise<string> {
  const image = document.createElement("img");
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("The selected image could not be read."));
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
    reader.onerror = () =>
      reject(new Error("The selected image could not be saved."));
    reader.readAsDataURL(blob);
  });
}

const storage = createLocalStorage({
  asyncStorage: AsyncStorage,
  fileSystem: FileSystem,
  platform: Platform.OS,
  persistWebImage,
});

export const {
  loadAppData,
  saveAppData,
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  loadWeatherSnapshot,
  saveWeatherSnapshot,
  copyImageToAppDocuments,
  removeStoredImage,
  removeUnreferencedStoredImage,
} = storage;
