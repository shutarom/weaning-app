import type { DailyLog, DailyPlan, MealName, MealLog, FreeEntry } from "../domain/types";
import { syncLogToCloud, syncPlanToCloud, toMillis } from "./cloudSync";
import { PLAN_SCHEMA_VERSION } from "../domain/suggestionEngine";
import { getBabyId } from "../lib/babyState";
import { safeGetItem, safeSetItem } from "../lib/storage";
import { newLocalId } from "../lib/compat";

// 赤ちゃんごとにローカルの記録を分離する（babyIdが未確定の間は使われない想定）。
function storageKey(): string {
  return `weaning_app_v2:${getBabyId() ?? "_"}`;
}

// ✅ store更新通知（App/Calendarがこれを受けて即時再描画）
export const STORE_CHANGED_EVENT_NAME = "weaning_store_changed";
function notifyStoreChanged() {
  // profileStore/ingredientStore と同じ理由でディスパッチをマイクロタスクまで遅延させる。
  queueMicrotask(() => window.dispatchEvent(new Event(STORE_CHANGED_EVENT_NAME)));
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
    const raw = safeGetItem(storageKey());
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
  safeSetItem(storageKey(), JSON.stringify(store));
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

/**
 * 既存planがあれば返し、なければfactoryで生成→保存して返す。
 * ただし当日・未来日について、安全フィルタ(アレルゲン・月齢)を含む
 * ロジックが更新されている(version < PLAN_SCHEMA_VERSION)場合は、
 * 記録として確定していないため破棄して作り直す。過去日は実績と対になる
 * 提案内容を変えないため対象外にする。
 */
export function getOrCreatePlan(dateIso: string, factory: (revision: number) => DailyPlan): DailyPlan {
  const store = readStore();
  const existing = store.plans[dateIso];
  const isStale = existing && existing.version < PLAN_SCHEMA_VERSION && dateIso >= toIso(new Date());
  if (existing && !isStale) return existing;

  // 作り直しでも、その日にすでに再生成した回数は引き継ぐ
  const plan = factory(existing?.revision ?? 0);
  store.plans[dateIso] = plan;
  writeStore(store);

  // 新規生成時はクラウドにも保存
  void syncPlanToCloud(dateIso, store.plans[dateIso]).catch((e) => console.error("syncPlanToCloud failed", e));

  return plan;
}

/** 強制再生成（ロジック更新や、気分で変えたい時用） */
export function regeneratePlan(dateIso: string, factory: (revision: number) => DailyPlan): DailyPlan {
  const store = readStore();
  // revision を進めないと乱数シードが変わらず、同じ献立が返ってくる
  const plan = factory((store.plans[dateIso]?.revision ?? 0) + 1);
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
    const cloudLogMillis = toMillis(cloudLog.updatedAt);
    if (!local) {
      store.logs[dateIso] = { ...cloudLog, updatedAt: cloudLogMillis };
      changed = true;
      continue;
    }
    // meal 単位でマージ（Timestamp/数値どちらでも比較できるよう正規化）
    const mergedMeals = { ...local.meals };
    let mealChanged = false;
    for (const [key, cloudMeal] of Object.entries(cloudLog.meals)) {
      const mealName = key as MealName;
      const localMeal = local.meals[mealName];
      const cloudMealMillis = toMillis(cloudMeal?.updatedAt);
      if (!localMeal || cloudMealMillis > (localMeal?.updatedAt ?? 0)) {
        mergedMeals[mealName] = { ...(cloudMeal as MealLog), updatedAt: cloudMealMillis };
        mealChanged = true;
      }
    }
    // dayMemo: 更新日時が新しい方
    let dayMemo = local.dayMemo;
    if (cloudLog.dayMemo !== undefined && cloudLogMillis > (local.updatedAt ?? 0)) {
      dayMemo = cloudLog.dayMemo;
      mealChanged = true;
    }
    if (mealChanged) {
      store.logs[dateIso] = {
        ...local,
        meals: mergedMeals,
        dayMemo,
        updatedAt: Math.max(local.updatedAt ?? 0, cloudLogMillis),
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
    safeSetItem(storageKey(), JSON.stringify(store));
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
    id: newLocalId(12),
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
