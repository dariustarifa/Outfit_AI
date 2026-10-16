import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import {
  createGalleryPickerRecoveryStore,
  type GalleryPickerOutcome,
} from "./gallery-picker-recovery";

export const galleryPickerRecovery =
  createGalleryPickerRecoveryStore(AsyncStorage);

export function getGalleryPickerOutcome(
  result: Awaited<ReturnType<typeof ImagePicker.getPendingResultAsync>>,
): GalleryPickerOutcome {
  if (!result) return { status: "cancelled" };
  if ("code" in result) return { status: "error" };
  if (result.canceled) return { status: "cancelled" };

  const assets = result.assets
    .map(({ uri }) => ({ uri }))
    .filter(({ uri }) => Boolean(uri));
  return assets.length > 0
    ? { status: "selected", assets }
    : { status: "error" };
}

export async function preparePendingGalleryPickerRecovery() {
  let record = await galleryPickerRecovery.load();
  if (!record) return null;

  if (!record.outcome) {
    let outcome: GalleryPickerOutcome;
    try {
      outcome = getGalleryPickerOutcome(
        await ImagePicker.getPendingResultAsync(),
      );
    } catch {
      outcome = { status: "error" };
    }
    await galleryPickerRecovery.saveOutcome(outcome);
    record = await galleryPickerRecovery.load();
  }

  return record;
}
