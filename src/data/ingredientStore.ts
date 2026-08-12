import type { IngredientStatus } from "../domain/types";
import { syncIngredientStatusToCloud, toMillis } from "./cloudSync";
import { getBabyId } from "../lib/babyState";

// 赤ちゃんごとに食材チェックを分離する。
function storageKey(): string {
  return `weaning_ingredient_status_v1:${getBabyId() ?? "_"}`;
}

export const INGREDIENT_STATUS_CHANGED_EVENT_NAME = "weaning_ingredient_status_changed";
function notifyChanged() {
  // profileStore と同じ理由でディスパッチをマイクロタスクまで遅延させる。
  queueMicrotask(() => window.dispatchEvent(new Event(INGREDIENT_STATUS_CHANGED_EVENT_NAME)));
}

function readAll(): Record<string, IngredientStatus> {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, IngredientStatus>;
  } catch {
    return {};
  }
}

function writeAll(statuses: Record<string, IngredientStatus>): void {
  localStorage.setItem(storageKey(), JSON.stringify(statuses));
  notifyChanged();
}

export function loadIngredientStatuses(): Record<string, IngredientStatus> {
  return readAll();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * ステータス・メモ・アレルギー詳細を部分更新する。
 * "safe" に初めてした時は firstTriedAtIso を自動で今日にする
 * （保育園提出・問診の記録として、後から編集はできる）。
 */
export function setIngredientStatus(
  ingredientId: string,
  patch: Partial<Omit<IngredientStatus, "updatedAt">>
): void {
  const all = readAll();
  const prev = all[ingredientId];
  const next: IngredientStatus = { ...prev, ...patch, updatedAt: Date.now() } as IngredientStatus;
  if (patch.status === "safe" && !prev?.firstTriedAtIso && !patch.firstTriedAtIso) {
    next.firstTriedAtIso = todayIso();
  }
  all[ingredientId] = next;
  writeAll(all);
  void syncIngredientStatusToCloud(ingredientId, next).catch((e) =>
    console.error("syncIngredientStatusToCloud failed", e)
  );
}

/** meal単位と同様、updatedAtが新しい方を採用してマージする（Timestamp/数値を正規化して比較） */
export function mergeIngredientStatusesFromCloud(cloud: Record<string, IngredientStatus>): void {
  const local = readAll();
  let changed = false;
  for (const [id, cloudEntry] of Object.entries(cloud)) {
    const localEntry = local[id];
    const cloudMillis = toMillis(cloudEntry.updatedAt);
    if (!localEntry || cloudMillis > (localEntry.updatedAt ?? 0)) {
      local[id] = { ...cloudEntry, updatedAt: cloudMillis };
      changed = true;
    }
  }
  if (changed) writeAll(local);
}
