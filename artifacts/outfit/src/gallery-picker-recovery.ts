export type GalleryPickerIntent =
  | {
      target: "item";
      itemId?: string;
      returnTo: "home" | "wardrobe";
      note: string;
      photoUri: string | null;
    }
  | {
      target: "onboarding";
      fromPlus: boolean;
      allowMultiple: boolean;
      note: string;
      photoUri: string | null;
    };

export type GalleryPickerOutcome =
  | { status: "selected"; assets: { uri: string }[] }
  | { status: "cancelled" }
  | { status: "error" };

export interface GalleryPickerRecoveryRecord {
  intent: GalleryPickerIntent;
  outcome?: GalleryPickerOutcome;
}

interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const GALLERY_PICKER_RECOVERY_KEY = "@outfit/gallery-picker-recovery";

export function createGalleryPickerRecoveryStore(storage: AsyncKeyValueStorage) {
  async function load(): Promise<GalleryPickerRecoveryRecord | null> {
    const value = await storage.getItem(GALLERY_PICKER_RECOVERY_KEY);
    if (!value) return null;

    try {
      const record = JSON.parse(value) as GalleryPickerRecoveryRecord;
      if (
        !record ||
        !record.intent ||
        (record.intent.target !== "item" &&
          record.intent.target !== "onboarding")
      ) {
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  return {
    load,
    async saveIntent(intent: GalleryPickerIntent): Promise<void> {
      await storage.setItem(
        GALLERY_PICKER_RECOVERY_KEY,
        JSON.stringify({ intent }),
      );
    },
    async saveOutcome(outcome: GalleryPickerOutcome): Promise<void> {
      const record = await load();
      if (!record) return;
      await storage.setItem(
        GALLERY_PICKER_RECOVERY_KEY,
        JSON.stringify({ intent: record.intent, outcome }),
      );
    },
    async clear(): Promise<void> {
      await storage.removeItem(GALLERY_PICKER_RECOVERY_KEY);
    },
  };
}
