export interface GalleryAssetLike {
  uri: string;
}

export interface GallerySaveProgress {
  completed: number;
  total: number;
}

export interface GallerySaveResult {
  added: number;
  failed: number;
}

export async function saveGallerySelection<T extends GalleryAssetLike>(
  assets: readonly T[],
  addItem: (item: { imageUri: string; note: string }) => Promise<unknown>,
  onProgress?: (progress: GallerySaveProgress) => void,
): Promise<GallerySaveResult> {
  let added = 0;
  let failed = 0;

  for (let index = 0; index < assets.length; index += 1) {
    try {
      await addItem({ imageUri: assets[index]!.uri, note: "" });
      added += 1;
    } catch {
      failed += 1;
    }
    onProgress?.({ completed: index + 1, total: assets.length });
  }

  return { added, failed };
}
