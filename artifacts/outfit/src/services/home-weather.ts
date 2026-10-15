import type { Profile, WeatherSnapshot } from "../types";

const MADRID_LATITUDE = 40.4168;
const MADRID_LONGITUDE = -3.7038;

type WeatherLocation = Pick<Profile, "latitude" | "longitude">;
type WeatherFetcher = (
  latitude: number,
  longitude: number,
) => Promise<WeatherSnapshot>;
type WeatherSaver = (weather: WeatherSnapshot) => Promise<void>;

export async function refreshWeatherForProfile(
  profile: WeatherLocation,
  fetchWeather: WeatherFetcher,
  saveWeather: WeatherSaver,
): Promise<WeatherSnapshot> {
  const latitude = profile.latitude ?? MADRID_LATITUDE;
  const longitude = profile.longitude ?? MADRID_LONGITUDE;
  const snapshot = await fetchWeather(latitude, longitude);
  await saveWeather(snapshot);
  return snapshot;
}

export function getHomeWeatherText(
  clock: string,
  weather: WeatherSnapshot | null,
  city: string,
): string {
  return weather
    ? `${clock} · ${Math.round(weather.temperatureC)}° · ${weather.condition}`
    : `${clock} · ${city}`;
}
