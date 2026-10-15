import assert from "node:assert/strict";
import test from "node:test";
import { recommendDailyOutfit } from "./services/daily-recommendation.ts";

const date = new Date(2026, 9, 15, 12);

function item(id, note) {
  return { id, imageUri: `${id}.jpg`, note, createdAt: 1 };
}

function weather({
  temperatureC = 20,
  minTemperatureC = 15,
  condition = "Despejado",
  precipitationProbability = 0,
} = {}) {
  return {
    temperatureC,
    minTemperatureC,
    maxTemperatureC: 25,
    condition,
    precipitationProbability,
    updatedAt: 1,
  };
}

const separates = [
  item("top", "Camisa azul"),
  item("bottom", "Pantalón negro"),
];

test("an empty wardrobe returns a starting state without invented items", () => {
  const recommendation = recommendDailyOutfit([], date, null);

  assert.equal(recommendation.mode, "starting");
  assert.deepEqual(recommendation.items, []);
  assert.match(recommendation.explanation, /armario está vacío/);
});

test("an unclassified wardrobe is presented only as a starting point", () => {
  const wardrobe = [item("unknown", "Mi prenda favorita")];
  const recommendation = recommendDailyOutfit(wardrobe, date, null);

  assert.equal(recommendation.mode, "starting");
  assert.equal(recommendation.items.length, 1);
  assert.equal(recommendation.items[0].item.id, "unknown");
  assert.equal(recommendation.items[0].kind, null);
  assert.match(recommendation.items[0].reason, /no identifica el tipo/);
  assert.match(recommendation.explanation, /punto de partida/);
});

test("complete separates are recommended together with saved shoes", () => {
  const wardrobe = [...separates, item("shoes", "Botines marrones")];
  const recommendation = recommendDailyOutfit(wardrobe, date, null);

  assert.equal(recommendation.mode, "outfit");
  assert.deepEqual(
    recommendation.items.map(({ kind }) => kind),
    ["upper", "lower", "shoes"],
  );
  assert.ok(
    recommendation.items.every(({ item: selected }) =>
      wardrobe.some(({ id }) => id === selected.id),
    ),
  );
});

test("one-piece outfits do not mix in separates and classify accented Spanish notes", () => {
  const wardrobe = [
    item("dress", "Vestido rojo"),
    item("shoes", "Botín cómodo"),
  ];
  const recommendation = recommendDailyOutfit(wardrobe, date, null);
  const selectedKinds = recommendation.items.map(({ kind }) => kind);

  assert.equal(recommendation.mode, "outfit");
  assert.deepEqual(selectedKinds, ["onePiece", "shoes"]);
  assert.ok(
    recommendation.items.every(({ item: selected }) =>
      wardrobe.some(({ id }) => id === selected.id),
    ),
  );
});

test("repeated requests for the same local day return the same selection", () => {
  const wardrobe = [
    item("top-a", "Camiseta verde"),
    item("top-b", "Jersey azul"),
    item("bottom-a", "Falda negra"),
    item("bottom-b", "Vaqueros"),
    item("dress-a", "Vestido de flores"),
    item("dress-b", "Mono corto"),
    item("shoes-a", "Zapatillas"),
    item("shoes-b", "Sandalias"),
  ];
  const first = recommendDailyOutfit(wardrobe, new Date(2026, 9, 15, 8), null);
  const second = recommendDailyOutfit(wardrobe, new Date(2026, 9, 15, 22), null);

  assert.deepEqual(second, first);
});

test("cold weather includes a saved outer layer and explains why", () => {
  const wardrobe = [...separates, item("outer", "Chaqueta impermeable")];
  const recommendation = recommendDailyOutfit(
    wardrobe,
    date,
    weather({ temperatureC: 12, minTemperatureC: 8 }),
  );
  const layer = recommendation.items.find(({ kind }) => kind === "outer");

  assert.ok(layer);
  assert.equal(layer.item.id, "outer");
  assert.match(layer.reason, /mínima prevista|frío/);
  assert.match(recommendation.explanation, /capa exterior se incluye/);
});

test("rainy weather includes a saved outer layer and explains why", () => {
  const wardrobe = [...separates, item("outer", "Gabardina beige")];
  const recommendation = recommendDailyOutfit(
    wardrobe,
    date,
    weather({
      temperatureC: 20,
      minTemperatureC: 16,
      condition: "Lluvia",
      precipitationProbability: 0,
    }),
  );
  const layer = recommendation.items.find(({ kind }) => kind === "outer");

  assert.ok(layer);
  assert.equal(layer.item.id, "outer");
  assert.match(layer.reason, /pronóstico.*lluvia/);
  assert.match(recommendation.explanation, /capa exterior se incluye/);
});

test("cold or rainy weather explains when no saved outer layer is available", () => {
  for (const forecast of [
    weather({ temperatureC: 10, minTemperatureC: 7 }),
    weather({ temperatureC: 20, minTemperatureC: 16, precipitationProbability: 40 }),
  ]) {
    const recommendation = recommendDailyOutfit(separates, date, forecast);

    assert.ok(!recommendation.items.some(({ kind }) => kind === "outer"));
    assert.match(recommendation.explanation, /no hay una capa exterior descrita/);
  }
});

test("warm, dry weather does not add a saved outer layer unnecessarily", () => {
  const recommendation = recommendDailyOutfit(
    [...separates, item("outer", "Chaqueta vaquera")],
    date,
    weather({ temperatureC: 20, minTemperatureC: 13, precipitationProbability: 39 }),
  );

  assert.ok(!recommendation.items.some(({ kind }) => kind === "outer"));
  assert.match(recommendation.explanation, /no añadimos una capa exterior/);
});

test("the cold and rain thresholds include exactly 12 degrees and 40 percent", () => {
  const wardrobe = [...separates, item("outer", "Abrigo gris")];
  const atColdThreshold = recommendDailyOutfit(
    wardrobe,
    date,
    weather({ temperatureC: 13, minTemperatureC: 12 }),
  );
  const aboveColdThreshold = recommendDailyOutfit(
    wardrobe,
    date,
    weather({ temperatureC: 13, minTemperatureC: 13 }),
  );
  const atRainThreshold = recommendDailyOutfit(
    wardrobe,
    date,
    weather({ temperatureC: 20, minTemperatureC: 15, precipitationProbability: 40 }),
  );
  const belowRainThreshold = recommendDailyOutfit(
    wardrobe,
    date,
    weather({ temperatureC: 20, minTemperatureC: 15, precipitationProbability: 39 }),
  );

  assert.ok(atColdThreshold.items.some(({ kind }) => kind === "outer"));
  assert.ok(!aboveColdThreshold.items.some(({ kind }) => kind === "outer"));
  assert.ok(atRainThreshold.items.some(({ kind }) => kind === "outer"));
  assert.ok(!belowRainThreshold.items.some(({ kind }) => kind === "outer"));
});
