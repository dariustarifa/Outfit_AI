export interface CityResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface GeocodingResponse {
  results?: CityResult[];
}

export function formatCity(city: CityResult): string {
  return [city.name, city.admin1, city.country]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
}

export async function searchCities(
  query: string,
  signal: AbortSignal,
): Promise<CityResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: "5",
    language: "es",
    format: "json",
  });
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`City search failed (${response.status}).`);
  }

  const data = (await response.json()) as GeocodingResponse;
  return (data.results ?? [])
    .filter(
      (city) =>
        typeof city.name === "string" &&
        Number.isFinite(city.latitude) &&
        Number.isFinite(city.longitude),
    )
    .slice(0, 5);
}
