import { loadWeatherSnapshot } from "../storage";
import type { WeatherSnapshot } from "../types";

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

export function weatherLabel(code: number): string {
  if (code === 0) return "Despejado";
  if (code === 1 || code === 2) return "Poco nuboso";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if (code >= 51 && code <= 57) return "Llovizna";
  if (code >= 61 && code <= 67) return "Lluvia";
  if (code >= 71 && code <= 77) return "Nieve";
  if (code >= 80 && code <= 82) return "Chubascos";
  if (code >= 95 && code <= 99) return "Tormenta";
  return "Nublado";
}

function firstNumber(values: number[] | undefined): number | null {
  const value = values?.[0];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
  });

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`Weather request failed (${response.status}).`);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const temperature = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    const minTemperatureC = firstNumber(data.daily?.temperature_2m_min);
    const maxTemperatureC = firstNumber(data.daily?.temperature_2m_max);
    const precipitationProbability = firstNumber(
      data.daily?.precipitation_probability_max,
    );

    if (
      typeof temperature !== "number" ||
      !Number.isFinite(temperature) ||
      typeof code !== "number" ||
      !Number.isFinite(code) ||
      minTemperatureC === null ||
      maxTemperatureC === null ||
      precipitationProbability === null
    ) {
      throw new Error("Weather response is missing current or daily values.");
    }

    return {
      temperatureC: temperature,
      condition: weatherLabel(code),
      updatedAt: Date.now(),
      minTemperatureC,
      maxTemperatureC,
      precipitationProbability,
    };
  } catch (error) {
    const saved = await loadWeatherSnapshot();
    if (saved) return saved;
    throw error;
  }
}
