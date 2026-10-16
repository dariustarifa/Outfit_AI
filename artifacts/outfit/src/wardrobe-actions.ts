import type { StoredAppData, WardrobeItem } from "./types";

export interface NewWardrobeItem {
  imageUri: string;
  note: string;
}

interface WardrobeActionDependencies {
  getData(): StoredAppData;
  commitWardrobe(wardrobe: WardrobeItem[]): Promise<void>;
  copyImageToAppDocuments(sourceUri: string): Promise<string>;
  removeStoredImage(imageUri: string): Promise<void>;
  removeUnreferencedStoredImage(imageUri: string): Promise<void>;
  onError(error: Error): void;
}

export function createWardrobeActions({
  getData,
  commitWardrobe,
  copyImageToAppDocuments,
  removeStoredImage,
  removeUnreferencedStoredImage,
  onError,
}: WardrobeActionDependencies) {
  let mutationQueue: Promise<void> = Promise.resolve();

  const runMutation = <Result,>(
    operation: () => Promise<Result>,
  ): Promise<Result> => {
    const result = mutationQueue.then(operation, operation);
    mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const reportError = (cause: unknown, fallback: string): Error => {
    const error = cause instanceof Error ? cause : new Error(fallback);
    onError(error);
    return error;
  };

  const addItem = (item: NewWardrobeItem): Promise<WardrobeItem> =>
    runMutation(async () => {
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
        await commitWardrobe(nextWardrobe);
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
    });

  const updateItem = (
    itemId: string,
    updates: Partial<Pick<WardrobeItem, "imageUri" | "note">>,
  ): Promise<void> =>
    runMutation(async () => {
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
        await commitWardrobe(nextWardrobe);
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
    });

  const removeItem = (itemId: string): Promise<void> =>
    runMutation(async () => {
      try {
        const currentData = getData();
        const previousItem = currentData.wardrobe.find(
          (item) => item.id === itemId,
        );
        if (!previousItem) return;

        const nextWardrobe = currentData.wardrobe.filter(
          (item) => item.id !== itemId,
        );
        await commitWardrobe(nextWardrobe);
        await removeStoredImage(previousItem.imageUri);
      } catch (cause) {
        throw reportError(cause, "Could not remove wardrobe item.");
      }
    });

  return { addItem, updateItem, removeItem };
}
