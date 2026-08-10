import type { DailyLog, DailyPlan, MealName, MealLog, FreeEntry } from "../domain/types";
import { syncLogToCloud, syncPlanToCloud } from "./cloudSync";

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

  // Firestoreへも同期（失敗してもローカルは生きる）
  void syncLogToCloud(dateIso, logs[dateIso]).catch((e) => console.error("syncLogToCloud failed", e));
}

export function upsertDayMemo(dateIso: string, memo: string): void {
  const store = readStore();
  const logs = store.logs;

  const cur: DailyLog = logs[dateIso] ?? { dateIso, meals: {} };
  cur.dayMemo = memo;
  cur.updatedAt = Date.now();
  logs[dateIso] = cur;

  writeStore({ ...store, logs });
  void syncLogToCloud(dateIso, logs[dateIso]).catch((e) => console.error("syncLogToCloud failed", e));
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
  void syncPlanToCloud(plan.dateIso, plans[plan.dateIso]).catch((e) => console.error("syncPlanToCloud failed", e));
}

/** 既存planがあれば返し、なければfactoryで生成→保存して返す */
export function getOrCreatePlan(dateIso: string, factory: () => DailyPlan): DailyPlan {
  const store = readStore();
  const existing = store.plans[dateIso];
  if (existing) return existing;

  const plan = factory();
  store.plans[dateIso] = plan;
  writeStore(store);

  // 新規生成時はクラウドにも保存
  void syncPlanToCloud(dateIso, store.plans[dateIso]).catch((e) => console.error("syncPlanToCloud failed", e));
  
  return plan;
}

/** 強制再生成（ロジック更新や、気分で変えたい時用） */
export function regeneratePlan(dateIso: string, factory: () => DailyPlan): DailyPlan {
  const store = readStore();
  const plan = factory();
  store.plans[dateIso] = plan;
  writeStore(store);

  void syncPlanToCloud(dateIso, store.plans[dateIso]).catch((e) => console.error("syncPlanToCloud failed", e));

  return plan;
}

/**
 * クラウドから取得したデータをローカルにマージする。
 * ログ: meal 単位で updatedAt が新しい方を採用
 * プラン: ローカルにないものだけ補完（ローカルの再生成を上書きしない）
 */
export function mergeFromCloud(
  cloudLogs: Record<string, DailyLog>,
  cloudPlans: Record<string, DailyPlan>
): void {
  const store = readStore();
  let changed = false;

  // ---- logs ----
  for (const [dateIso, cloudLog] of Object.entries(cloudLogs)) {
    const local = store.logs[dateIso];
    if (!local) {
      store.logs[dateIso] = cloudLog;
      changed = true;
      continue;
    }
    // meal 単位でマージ
    const mergedMeals = { ...local.meals };
    let mealChanged = false;
    for (const [key, cloudMeal] of Object.entries(cloudLog.meals)) {
      const mealName = key as MealName;
      const localMeal = local.meals[mealName];
      if (!localMeal || (cloudMeal?.updatedAt ?? 0) > (localMeal?.updatedAt ?? 0)) {
        mergedMeals[mealName] = cloudMeal as MealLog;
        mealChanged = true;
      }
    }
    // dayMemo: 更新日時が新しい方
    let dayMemo = local.dayMemo;
    if (cloudLog.dayMemo !== undefined && (cloudLog.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
      dayMemo = cloudLog.dayMemo;
      mealChanged = true;
    }
    if (mealChanged) {
      store.logs[dateIso] = {
        ...local,
        meals: mergedMeals,
        dayMemo,
        updatedAt: Math.max(local.updatedAt ?? 0, cloudLog.updatedAt ?? 0),
      };
      changed = true;
    }
  }

  // ---- plans: ローカルにないものだけ補完 ----
  for (const [dateIso, cloudPlan] of Object.entries(cloudPlans)) {
    if (!store.plans[dateIso]) {
      store.plans[dateIso] = cloudPlan;
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(KEY, JSON.stringify(store));
    notifyStoreChanged();
  }
}

export function getRecentPlans(dateIso: string, days = 14): DailyPlan[] {
  const plans = readStore().plans;
  const end = new Date(dateIso);
  const out: DailyPlan[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const k = toIso(d);
    if (plans[k]) out.push(plans[k]);
  }
  return out;
}

// ===== 自由入力エントリ =====

export function addFreeEntry(
  dateIso: string,
  meal: MealName,
  entry: Omit<FreeEntry, "id" | "updatedAt">
): void {
  const store = readStore();
  const logs = store.logs;
  const cur: DailyLog = logs[dateIso] ?? { dateIso, meals: {} };
  const mlog = cur.meals[meal] ?? {};
  const newEntry: FreeEntry = {
    id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    updatedAt: Date.now(),
    ...entry,
  };
  cur.meals[meal] = {
    ...mlog,
    freeEntries: [...(mlog.freeEntries ?? []), newEntry],
    updatedAt: Date.now(),
  };
  cur.updatedAt = Date.now();
  logs[dateIso] = cur;
  writeStore({ ...store, logs });
  void syncLogToCloud(dateIso, logs[dateIso]).catch((e) => console.error("syncLogToCloud failed", e));
}

export function removeFreeEntry(
  dateIso: string,
  meal: MealName,
  id: string
): void {
  const store = readStore();
  const logs = store.logs;
  const cur = logs[dateIso];
  if (!cur) return;
  const mlog = cur.meals[meal];
  if (!mlog) return;
  cur.meals[meal] = {
    ...mlog,
    freeEntries: (mlog.freeEntries ?? []).filter((e) => e.id !== id),
    updatedAt: Date.now(),
  };
  cur.updatedAt = Date.now();
  logs[dateIso] = cur;
  writeStore({ ...store, logs });
  void syncLogToCloud(dateIso, logs[dateIso]).catch((e) => console.error("syncLogToCloud failed", e));
}

/** utils */
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
