import type { StoredAppData, WardrobeItem } from "./types";

export interface NewWardrobeItem {
  imageUri: string;
  note: string;
}

interface WardrobeActionDependencies {
  getData(): StoredAppData;
  commit(next: StoredAppData): Promise<void>;
  copyImageToAppDocuments(sourceUri: string): Promise<string>;
  removeStoredImage(imageUri: string): Promise<void>;
  removeUnreferencedStoredImage(imageUri: string): Promise<void>;
  onError(error: Error): void;
}

export function createWardrobeActions({
  getData,
  commit,
  copyImageToAppDocuments,
  removeStoredImage,
  removeUnreferencedStoredImage,
  onError,
}: WardrobeActionDependencies) {
  const reportError = (cause: unknown, fallback: string): Error => {
    const error = cause instanceof Error ? cause : new Error(fallback);
    onError(error);
    return error;
  };

  const addItem = async (item: NewWardrobeItem): Promise<WardrobeItem> => {
    let copiedImageUri: string | undefined;
    try {
      copiedImageUri = await copyImageToAppDocuments(item.imageUri);
      const savedItem: WardrobeItem = {
        id: `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,
        imageUri: copiedImageUri,
        note: item.note,
        createdAt: Date.now(),
      };
      const currentData = getData();
      const nextWardrobe = [...currentData.wardrobe, savedItem];
      await commit({ ...currentData, wardrobe: nextWardrobe });
      return savedItem;
    } catch (cause) {
      if (copiedImageUri) {
        try {
          await removeUnreferencedStoredImage(copiedImageUri);
        } catch {
          // A later load reconciles any managed photo left by a failed cleanup.
        }
      }
      throw reportError(cause, "Could not save wardrobe item.");
    }
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<Pick<WardrobeItem, "imageUri" | "note">>,
  ): Promise<void> => {
    let copiedImageUri: string | undefined;
    try {
      const currentData = getData();
      const previousItem = currentData.wardrobe.find(
        (item) => item.id === itemId,
      );
      if (!previousItem) throw new Error("Wardrobe item was not found.");

      const nextImageUri =
        updates.imageUri && updates.imageUri !== previousItem.imageUri
          ? (copiedImageUri = await copyImageToAppDocuments(updates.imageUri))
          : previousItem.imageUri;
      const updatedItem: WardrobeItem = {
        ...previousItem,
        note: updates.note ?? previousItem.note,
        imageUri: nextImageUri,
      };
      const nextWardrobe = currentData.wardrobe.map((item) =>
        item.id === itemId ? updatedItem : item,
      );
      await commit({ ...currentData, wardrobe: nextWardrobe });
      if (nextImageUri !== previousItem.imageUri) {
        await removeStoredImage(previousItem.imageUri);
      }
    } catch (cause) {
      if (copiedImageUri) {
        try {
          await removeUnreferencedStoredImage(copiedImageUri);
        } catch {
          // A later load reconciles any managed photo left by a failed cleanup.
        }
      }
      throw reportError(cause, "Could not update wardrobe item.");
    }
  };

  const removeItem = async (itemId: string): Promise<void> => {
    try {
      const currentData = getData();
      const previousItem = currentData.wardrobe.find(
        (item) => item.id === itemId,
      );
      if (!previousItem) return;

      const nextWardrobe = currentData.wardrobe.filter(
        (item) => item.id !== itemId,
      );
      await commit({ ...currentData, wardrobe: nextWardrobe });
      await removeStoredImage(previousItem.imageUri);
    } catch (cause) {
      throw reportError(cause, "Could not remove wardrobe item.");
    }
  };

  return { addItem, updateItem, removeItem };
}
