import type { WardrobeItem } from "./types";

export function searchWardrobeItems(
  items: WardrobeItem[],
  query: string,
): WardrobeItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  return items.filter((item) =>
    normalizeSearchText(item.note).includes(normalizedQuery),
  );
}

export function getWardrobeScreenState(
  wardrobe: WardrobeItem[],
  query: string,
) {
  const filteredWardrobe = searchWardrobeItems(wardrobe, query);

  return {
    filteredWardrobe,
    displayCount: query.trim() ? filteredWardrobe.length : wardrobe.length,
  };
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
