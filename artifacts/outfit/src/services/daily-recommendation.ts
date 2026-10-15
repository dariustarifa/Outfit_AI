import type { WardrobeItem, WeatherSnapshot } from "../types";

export type GarmentKind =
  | "upper"
  | "lower"
  | "onePiece"
  | "shoes"
  | "outer";

export interface RecommendedItem {
  item: WardrobeItem;
  kind: GarmentKind | null;
  reason: string;
}

export interface DailyRecommendation {
  mode: "outfit" | "starting";
  items: RecommendedItem[];
  explanation: string;
}

type GarmentGroups = Record<GarmentKind, WardrobeItem[]>;

const KIND_KEYWORDS: Record<GarmentKind, string[]> = {
  onePiece: [
    "vestido", "vestidos", "mono", "monos", "jumpsuit", "jumpsuits",
    "peto", "petos", "enterizo", "enterizos",
  ],
  shoes: [
    "zapato", "zapatos", "zapatilla", "zapatillas", "bota", "botas",
    "botin", "botines", "sandalia", "sandalias", "tacon", "tacones",
    "mocasin", "mocasines", "alpargata", "alpargatas", "calzado", "tenis",
  ],
  outer: [
    "abrigo", "abrigos", "chaqueta", "chaquetas", "cazadora", "cazadoras",
    "parka", "parkas", "impermeable", "impermeables", "gabardina",
    "gabardinas", "trench", "blazer", "blazers", "americana", "americanas",
    "cardigan", "cardigans", "rebeca", "rebecas", "plumifero", "plumiferos",
    "anorak", "anoraks", "capa", "capas",
  ],
  lower: [
    "pantalon", "pantalones", "vaquero", "vaqueros", "jean", "jeans",
    "falda", "faldas", "short", "shorts", "bermuda", "bermudas",
    "legging", "leggings", "malla", "mallas", "culotte", "culottes",
    "chino", "chinos",
  ],
  upper: [
    "camiseta", "camisetas", "camisa", "camisas", "blusa", "blusas",
    "top", "tops", "jersey", "jerseys", "sueter", "sueteres",
    "sudadera", "sudaderas", "polo", "polos", "body", "bodys",
  ],
};

const KIND_LABELS: Record<GarmentKind, string> = {
  upper: "parte superior",
  lower: "parte de abajo",
  onePiece: "prenda de una pieza",
  shoes: "calzado",
  outer: "capa exterior",
};

const ROTATION_OFFSETS: Record<GarmentKind, number> = {
  upper: 3,
  lower: 7,
  onePiece: 11,
  shoes: 13,
  outer: 17,
};

function normalizeNote(note: string): string {
  return note
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsKeyword(note: string, keyword: string): boolean {
  return ` ${note} `.includes(` ${keyword} `);
}

function identifyKind(note: string): GarmentKind | null {
  const normalized = normalizeNote(note);
  if (!normalized) return null;

  for (const kind of Object.keys(KIND_KEYWORDS) as GarmentKind[]) {
    if (KIND_KEYWORDS[kind].some((keyword) => containsKeyword(normalized, keyword))) {
      return kind;
    }
  }
  return null;
}

function localDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

function pickForDay(
  items: WardrobeItem[],
  dayNumber: number,
  kind: GarmentKind,
): WardrobeItem | null {
  if (items.length === 0) return null;
  const index = (dayNumber + ROTATION_OFFSETS[kind]) % items.length;
  return items[index] ?? null;
}

function isRainy(weather: WeatherSnapshot): boolean {
  const condition = normalizeNote(weather.condition);
  return (
    weather.precipitationProbability >= 40 ||
    [
      "lluvia",
      "llovizna",
      "chubasco",
      "chubascos",
      "lluvioso",
      "rain",
      "shower",
      "tormenta",
      "tormentas",
    ].some((keyword) => containsKeyword(condition, keyword))
  );
}

function getLayerReason(
  weather: WeatherSnapshot,
  cold: boolean,
  rainy: boolean,
): string {
  if (rainy) {
    if (weather.precipitationProbability >= 40) {
      return `La añado por la posibilidad de lluvia (${Math.round(weather.precipitationProbability)}%).`;
    }
    return "La añado porque el pronóstico de hoy anuncia lluvia.";
  }
  if (cold) {
    if (weather.minTemperatureC < weather.temperatureC) {
      return `La añado porque la mínima prevista es de ${Math.round(weather.minTemperatureC)}°.`;
    }
    return `La añado porque hoy hará ${Math.round(weather.temperatureC)}° y puede venir bien una capa extra.`;
  }
  return "Una capa extra para tener a mano según el tiempo de hoy.";
}

function getStartingReason(kind: GarmentKind | null): string {
  if (!kind) {
    return "La nota no identifica el tipo de prenda; úsala solo como punto de partida, no como una combinación confirmada.";
  }
  return `La nota la identifica como ${KIND_LABELS[kind]}, pero faltan otras prendas descritas para proponer un conjunto.`;
}

export function recommendDailyOutfit(
  wardrobe: WardrobeItem[],
  date: Date,
  weather: WeatherSnapshot | null,
  dailyPlan?: string | null,
): DailyRecommendation {
  const plan = dailyPlan?.trim().replace(/\s+/g, " ");
  const explainPlan = (explanation: string) =>
    plan
      ? `Para «${plan}», he tenido en cuenta tu plan de hoy y he elegido únicamente prendas guardadas en tu armario. ${explanation}`
      : explanation;
  const dayNumber = localDayNumber(date);
  const groups: GarmentGroups = {
    upper: [],
    lower: [],
    onePiece: [],
    shoes: [],
    outer: [],
  };
  const classifiedKinds = new Map<string, GarmentKind | null>();

  for (const item of wardrobe) {
    const kind = identifyKind(item.note);
    classifiedKinds.set(item.id, kind);
    if (kind) groups[kind].push(item);
  }

  const hasSeparates = groups.upper.length > 0 && groups.lower.length > 0;
  const hasOnePiece = groups.onePiece.length > 0;
  const cold = Boolean(
    weather &&
      (weather.temperatureC <= 12 || weather.minTemperatureC <= 12),
  );
  const rainy = Boolean(weather && isRainy(weather));
  const baseOptions: Array<"separates" | "onePiece"> = [];
  if (hasSeparates) baseOptions.push("separates");
  if (hasOnePiece) baseOptions.push("onePiece");

  if (baseOptions.length === 0) {
    const startingItem = pickForDay(wardrobe, dayNumber, "onePiece");
    if (!startingItem) {
      return {
        mode: "starting",
        items: [],
        explanation: explainPlan(
          "Tu armario está vacío; añade una prenda para recibir una idea diaria.",
        ),
      };
    }
    const kind = classifiedKinds.get(startingItem.id) ?? null;
    const selectedItems: RecommendedItem[] = [
      {
        item: startingItem,
        kind,
        reason:
          kind === "outer" && weather && (cold || rainy)
            ? getLayerReason(weather, cold, rainy)
            : getStartingReason(kind),
      },
    ];
    const extraOuterLayer =
      weather && (cold || rainy) && kind !== "outer"
        ? pickForDay(groups.outer, dayNumber, "outer")
        : null;
    if (extraOuterLayer && weather) {
      selectedItems.push({
        item: extraOuterLayer,
        kind: "outer",
        reason: getLayerReason(weather, cold, rainy),
      });
    }

    let weatherContext = "";
    if (!weather) {
      weatherContext = " No hay tiempo guardado para ajustar las capas.";
    } else if (cold || rainy) {
      if (kind === "outer") {
        weatherContext = " Esta pieza se propone como capa exterior por el tiempo de hoy.";
      } else if (extraOuterLayer) {
        weatherContext = " La capa exterior se añade por el frío o la lluvia previstos.";
      } else {
        weatherContext = " El tiempo indica frío o lluvia, pero no hay una capa exterior descrita en el armario.";
      }
    } else {
      weatherContext = ` Con ${Math.round(weather.temperatureC)}° y sin lluvia importante prevista, no añadimos capa exterior.`;
    }
    return {
      mode: "starting",
      items: selectedItems,
      explanation: explainPlan(
        "Aún no hay suficientes tipos de prenda identificados para proponer un conjunto; esta pieza es solo un punto de partida." +
          weatherContext,
      ),
    };
  }

  const selectedBase =
    baseOptions[dayNumber % baseOptions.length] ?? "separates";
  const selected: RecommendedItem[] = [];
  if (selectedBase === "separates") {
    const upper = pickForDay(groups.upper, dayNumber, "upper");
    const lower = pickForDay(groups.lower, dayNumber, "lower");
    if (upper && lower) {
      selected.push(
        {
          item: upper,
          kind: "upper",
          reason: "Parte superior para llevar con la parte de abajo propuesta.",
        },
        {
          item: lower,
          kind: "lower",
          reason: "Completa la combinación con la parte superior de hoy.",
        },
      );
    }
  } else {
    const onePiece = pickForDay(groups.onePiece, dayNumber, "onePiece");
    if (onePiece) {
      selected.push({
        item: onePiece,
        kind: "onePiece",
        reason: "Una sola pieza para definir el look de hoy.",
      });
    }
  }

  const shoes = pickForDay(groups.shoes, dayNumber, "shoes");
  if (shoes) {
    selected.push({
      item: shoes,
      kind: "shoes",
      reason: "Calzado de tu armario para completar la propuesta.",
    });
  }

  const outerLayer = cold || rainy ? pickForDay(groups.outer, dayNumber, "outer") : null;
  if (outerLayer && weather) {
    selected.push({
      item: outerLayer,
      kind: "outer",
      reason: getLayerReason(weather, cold, rainy),
    });
  }

  const explanation = !weather
    ? "La combinación se basa en las prendas descritas; no hay tiempo guardado para ajustar las capas."
    : cold || rainy
      ? outerLayer
        ? "La capa exterior se incluye por el frío o la lluvia que indica el tiempo guardado."
        : "El tiempo guardado indica frío o posibilidad de lluvia; no hay una capa exterior descrita en el armario."
      : `Con ${Math.round(weather.temperatureC)}° y sin lluvia importante prevista, no añadimos una capa exterior.`;

  return {
    mode: "outfit",
    items: selected,
    explanation: explainPlan(explanation),
  };
}
