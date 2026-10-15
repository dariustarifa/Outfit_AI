import type { Profile, WeatherSnapshot } from "../types";

const MADRID_LATITUDE = 40.4168;
const MADRID_LONGITUDE = -3.7038;

type WeatherLocation = Pick<Profile, "city" | "latitude" | "longitude">;
type WeatherFetcher = (
  latitude: number,
  longitude: number,
  locationKey: string,
) => Promise<WeatherSnapshot>;
type WeatherSaver = (weather: WeatherSnapshot) => Promise<void>;

export function getWeatherLocationKey(profile: WeatherLocation): string {
  const latitude = profile.latitude ?? MADRID_LATITUDE;
  const longitude = profile.longitude ?? MADRID_LONGITUDE;
  const city = profile.city?.trim().toLowerCase() ?? "";
  return `${city}:${latitude}:${longitude}`;
}

export function isWeatherForProfile(
  weather: WeatherSnapshot | null,
  profile: Profile | null,
): weather is WeatherSnapshot {
  return (
    !!weather &&
    !!profile &&
    weather.locationKey === getWeatherLocationKey(profile)
  );
}

export function getCachedWeatherForLocation(
  weather: WeatherSnapshot | null,
  locationKey: string,
): WeatherSnapshot | null {
  return weather?.locationKey === locationKey ? weather : null;
}

export async function refreshWeatherForProfile(
  profile: WeatherLocation,
  fetchWeather: WeatherFetcher,
  saveWeather: WeatherSaver,
): Promise<WeatherSnapshot> {
  const latitude = profile.latitude ?? MADRID_LATITUDE;
  const longitude = profile.longitude ?? MADRID_LONGITUDE;
  const locationKey = getWeatherLocationKey(profile);
  const snapshot = {
    ...(await fetchWeather(latitude, longitude, locationKey)),
    locationKey,
  };
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
