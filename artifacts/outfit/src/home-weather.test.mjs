import assert from "node:assert/strict";
import test from "node:test";
import {
  getCachedWeatherForLocation,
  getHomeWeatherText,
  getWeatherLocationKey,
  isWeatherForProfile,
  refreshWeatherForProfile,
} from "./services/home-weather.ts";
import { mergeProfileUpdate } from "./profile-update.ts";
import { fetchWeatherWithFallback } from "./services/weather-core.ts";

const weatherLocationKey = "sevilla:37.3891:-5.9845";
const cachedWeather = {
  temperatureC: 29,
  condition: "Despejado",
  updatedAt: 1_800_000_000_000,
  minTemperatureC: 18,
  maxTemperatureC: 32,
  precipitationProbability: 0,
  locationKey: weatherLocationKey,
};
const validOpenMeteoResponse = {
  current: { temperature_2m: 27.5, weather_code: 61 },
  daily: {
    temperature_2m_min: [17.2],
    temperature_2m_max: [31.6],
    precipitation_probability_max: [65],
  },
};

function weatherDependencies({ response, snapshot = null, fetchError } = {}) {
  const requests = [];
  return {
    requests,
    dependencies: {
      async fetcher(url) {
        requests.push(url);
        if (fetchError) throw fetchError;
        return typeof response === "function" ? response() : response;
      },
      async loadWeatherSnapshot() {
        return snapshot;
      },
      getCachedWeatherForLocation,
    },
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test("weather service parses a valid Open-Meteo response", async () => {
  const { dependencies, requests } = weatherDependencies({
    response: jsonResponse(validOpenMeteoResponse),
  });

  const weather = await fetchWeatherWithFallback(
    37.3891,
    -5.9845,
    weatherLocationKey,
    dependencies,
  );

  assert.equal(weather.temperatureC, 27.5);
  assert.equal(weather.condition, "Lluvia");
  assert.equal(weather.minTemperatureC, 17.2);
  assert.equal(weather.maxTemperatureC, 31.6);
  assert.equal(weather.precipitationProbability, 65);
  assert.equal(weather.locationKey, weatherLocationKey);
  assert.ok(Number.isFinite(weather.updatedAt));
  assert.equal(requests.length, 1);

  const requestUrl = new URL(requests[0]);
  assert.equal(requestUrl.searchParams.get("latitude"), "37.3891");
  assert.equal(requestUrl.searchParams.get("longitude"), "-5.9845");
  assert.equal(requestUrl.searchParams.get("timezone"), "auto");
});

test("incomplete Open-Meteo responses use the matching cached forecast", async () => {
  const { dependencies } = weatherDependencies({
    response: jsonResponse({
      current: { temperature_2m: 27.5, weather_code: 3 },
      daily: { temperature_2m_min: [17.2] },
    }),
    snapshot: cachedWeather,
  });

  assert.equal(
    await fetchWeatherWithFallback(
      37.3891,
      -5.9845,
      weatherLocationKey,
      dependencies,
    ),
    cachedWeather,
  );
});

test("non-success HTTP responses use the matching cached forecast", async () => {
  const { dependencies } = weatherDependencies({
    response: jsonResponse({}, 503),
    snapshot: cachedWeather,
  });

  assert.equal(
    await fetchWeatherWithFallback(
      37.3891,
      -5.9845,
      weatherLocationKey,
      dependencies,
    ),
    cachedWeather,
  );
});

test("request failures use the matching cached forecast", async () => {
  const { dependencies } = weatherDependencies({
    fetchError: new TypeError("Network request failed"),
    snapshot: cachedWeather,
  });

  assert.equal(
    await fetchWeatherWithFallback(
      37.3891,
      -5.9845,
      weatherLocationKey,
      dependencies,
    ),
    cachedWeather,
  );
});

test("weather service surfaces the HTTP error when no cached forecast exists", async () => {
  const { dependencies } = weatherDependencies({
    response: jsonResponse({}, 503),
  });

  await assert.rejects(
    fetchWeatherWithFallback(
      37.3891,
      -5.9845,
      weatherLocationKey,
      dependencies,
    ),
    { message: "Weather request failed (503)." },
  );
});

test("weather service surfaces a parsing error when no cached forecast exists", async () => {
  const { dependencies } = weatherDependencies({
    response: jsonResponse({ current: { temperature_2m: 12 } }),
  });

  await assert.rejects(
    fetchWeatherWithFallback(
      37.3891,
      -5.9845,
      weatherLocationKey,
      dependencies,
    ),
    { message: "Weather response is missing current or daily values." },
  );
});

test("changing the saved city refreshes and displays weather for its coordinates", async () => {
  const savedProfile = {
    name: "Alex",
    gender: "female",
    age: 30,
    heightCm: 170,
    bodyPhotoUri: "file:///profile.jpg",
    city: "Madrid",
    latitude: 40.4168,
    longitude: -3.7038,
    onboardingCompleted: true,
  };
  const updatedProfile = mergeProfileUpdate(savedProfile, {
    city: "Sevilla",
    latitude: 37.3891,
    longitude: -5.9845,
  });
  const requests = [];
  const savedWeather = [];
  const refreshedWeather = {
    temperatureC: 31.4,
    condition: "Despejado",
    updatedAt: 1_800_000_000_000,
    minTemperatureC: 19,
    maxTemperatureC: 33,
    precipitationProbability: 0,
  };

  await refreshWeatherForProfile(
    updatedProfile,
    async (latitude, longitude, locationKey) => {
      requests.push({ latitude, longitude, locationKey });
      return refreshedWeather;
    },
    async (weather) => {
      savedWeather.push(weather);
    },
  );

  assert.deepEqual(requests, [{
    latitude: 37.3891,
    longitude: -5.9845,
    locationKey: getWeatherLocationKey(updatedProfile),
  }]);
  assert.deepEqual(savedWeather, [{
    ...refreshedWeather,
    locationKey: getWeatherLocationKey(updatedProfile),
  }]);
  assert.equal(isWeatherForProfile(savedWeather[0], updatedProfile), true);
  assert.equal(isWeatherForProfile(savedWeather[0], savedProfile), false);
  assert.equal(
    isWeatherForProfile(savedWeather[0], { ...updatedProfile, city: "Madrid" }),
    false,
  );
  assert.equal(
    getHomeWeatherText("14:30", savedWeather[0], updatedProfile.city),
    "14:30 · 31° · Despejado",
  );
});

test("weather refresh uses Madrid coordinates when profile coordinates are missing", async () => {
  let request;

  await refreshWeatherForProfile(
    {},
    async (latitude, longitude) => {
      request = { latitude, longitude };
      return {
        temperatureC: 20,
        condition: "Nublado",
        updatedAt: 1_800_000_000_000,
        minTemperatureC: 15,
        maxTemperatureC: 22,
        precipitationProbability: 10,
      };
    },
    async () => {},
  );

  assert.deepEqual(request, { latitude: 40.4168, longitude: -3.7038 });
});

test("weather saved for another city or without a location is not used as a local forecast", () => {
  const madridWeather = {
    temperatureC: 18,
    condition: "Nublado",
    updatedAt: 1_800_000_000_000,
    minTemperatureC: 15,
    maxTemperatureC: 22,
    precipitationProbability: 10,
    locationKey: "madrid:40.4168:-3.7038",
  };

  assert.equal(
    getCachedWeatherForLocation(madridWeather, "sevilla:37.3891:-5.9845"),
    null,
  );
  assert.equal(
    getCachedWeatherForLocation(madridWeather, "madrid:40.4168:-3.7038"),
    madridWeather,
  );
  assert.equal(
    getCachedWeatherForLocation(
      { ...madridWeather, locationKey: undefined },
      "madrid:40.4168:-3.7038",
    ),
    null,
  );
});
