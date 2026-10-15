import { loadWeatherSnapshot } from "../storage";
import { getCachedWeatherForLocation } from "./home-weather";
import type { WeatherSnapshot } from "../types";
import { fetchWeatherWithFallback, weatherLabel } from "./weather-core";

export { weatherLabel };

export async function fetchWeather(
  latitude: number,
  longitude: number,
  locationKey: string,
): Promise<WeatherSnapshot> {
  return fetchWeatherWithFallback(latitude, longitude, locationKey, {
    fetcher: (url) => fetch(url),
    loadWeatherSnapshot,
    getCachedWeatherForLocation,
  });
}
