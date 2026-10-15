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
