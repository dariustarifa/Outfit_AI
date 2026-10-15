import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { Image, Platform } from "react-native";
import {
  createLocalStorage,
  PROFILE_PHOTO_MAX_DIMENSION,
} from "./storage-core";

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

async function resizeProfilePhoto(
  sourceUri: string,
  maxDimension: number,
): Promise<string> {
  const { width, height } = await new Promise<{
    width: number;
    height: number;
  }>((resolve, reject) => {
    Image.getSize(sourceUri, (photoWidth, photoHeight) => {
      resolve({ width: photoWidth, height: photoHeight });
    }, reject);
  });
  if (Math.max(width, height) <= maxDimension) {
    return sourceUri;
  }

  const resize =
    width >= height
      ? { width: maxDimension }
      : { height: maxDimension };
  // The native decoder applies the source image's EXIF orientation before
  // resizing, so portrait and landscape photos keep their intended rotation.
  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

const storage = createLocalStorage({
  asyncStorage: AsyncStorage,
  fileSystem: FileSystem,
  platform: Platform.OS,
  persistWebImage,
  resizeProfilePhoto,
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
  copyProfilePhotoToAppDocuments,
  removeStoredImage,
  removeUnreferencedStoredImage,
} = storage;
