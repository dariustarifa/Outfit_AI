export const DAILY_PLAN_KEY = "dailyPlan";
export const DAILY_PLAN_MAX_LENGTH = 120;

export interface DailyPlanStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export function normalizeDailyPlan(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, DAILY_PLAN_MAX_LENGTH)
    .trim();
}

export async function loadDailyPlan(
  storage: Pick<DailyPlanStorage, "getItem">,
): Promise<string | null> {
  const savedPlan = await storage.getItem(DAILY_PLAN_KEY);
  if (savedPlan === null) return null;
  const plan = normalizeDailyPlan(savedPlan);
  return plan || null;
}

export async function persistDailyPlan(
  storage: DailyPlanStorage,
  value: string | null,
): Promise<string | null> {
  const plan = value === null ? "" : normalizeDailyPlan(value);
  if (!plan) {
    await storage.removeItem(DAILY_PLAN_KEY);
    return null;
  }
  await storage.setItem(DAILY_PLAN_KEY, plan);
  return plan;
}
