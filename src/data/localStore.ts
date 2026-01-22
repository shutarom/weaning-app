import type { DailyLog, DailyPlan, MealName, MealLog } from "../domain/types";

const KEY = "weaning_app_v2"; // v1から変えてOK（安全に移行できる）

// ✅ store更新通知（App/Calendarがこれを受けて即時再描画）
export const STORE_CHANGED_EVENT_NAME = "weaning_store_changed";
function notifyStoreChanged() {
  window.dispatchEvent(new Event(STORE_CHANGED_EVENT_NAME));
}

type StoreShape = {
  logs: Record<string, DailyLog>;
  plans: Record<string, DailyPlan>;
};

function empty(): StoreShape {
  return { logs: {}, plans: {} };
}

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      logs: parsed.logs ?? {},
      plans: parsed.plans ?? {},
    };
  } catch {
    return empty();
  }
}

function writeStore(store: StoreShape): void {
  localStorage.setItem(KEY, JSON.stringify(store));
  notifyStoreChanged();
}

/** --- Logs --- */
export function loadAllLogs(): Record<string, DailyLog> {
  return readStore().logs;
}

export function getLog(dateIso: string): DailyLog | undefined {
  return readStore().logs[dateIso];
}

export function upsertMealLog(dateIso: string, meal: MealName, patch: MealLog): void {
  const store = readStore();
  const logs = store.logs;

  const cur: DailyLog = logs[dateIso] ?? { dateIso, meals: {} };

  cur.meals[meal] = {
    ...cur.meals[meal],
    ...patch,
    updatedAt: Date.now(),
  };
  cur.updatedAt = Date.now();

  logs[dateIso] = cur;
  writeStore({ ...store, logs });
}

export function upsertDayMemo(dateIso: string, memo: string): void {
  const store = readStore();
  const logs = store.logs;

  const cur: DailyLog = logs[dateIso] ?? { dateIso, meals: {} };
  cur.dayMemo = memo;
  cur.updatedAt = Date.now();
  logs[dateIso] = cur;

  writeStore({ ...store, logs });
}

export function getRecentLogs(dateIso: string, days = 14): DailyLog[] {
  const logs = readStore().logs;
  const end = new Date(dateIso);

  const out: DailyLog[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const k = toIso(d);
    if (logs[k]) out.push(logs[k]);
  }
  return out;
}

/** --- Plans --- */
export function loadAllPlans(): Record<string, DailyPlan> {
  return readStore().plans;
}

export function getPlan(dateIso: string): DailyPlan | undefined {
  return readStore().plans[dateIso];
}

/** 同じ日付キーで上書き保存（version管理用） */
export function upsertPlan(plan: DailyPlan): void {
  const store = readStore();
  const plans = store.plans;
  plans[plan.dateIso] = plan;
  writeStore({ ...store, plans });
}

/** 既存planがあれば返し、なければfactoryで生成→保存して返す */
export function getOrCreatePlan(dateIso: string, factory: () => DailyPlan): DailyPlan {
  const store = readStore();
  const existing = store.plans[dateIso];
  if (existing) return existing;

  const plan = factory();
  store.plans[dateIso] = plan;
  writeStore(store);
  return plan;
}

/** 強制再生成（ロジック更新や、気分で変えたい時用） */
export function regeneratePlan(dateIso: string, factory: () => DailyPlan): DailyPlan {
  const store = readStore();
  const plan = factory();
  store.plans[dateIso] = plan;
  writeStore(store);
  return plan;
}

/** utils */
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
