import type { IngredientStatus, IngredientStatusValue } from "../domain/types";
import { syncIngredientStatusToCloud, toMillis } from "./cloudSync";

const KEY = "weaning_ingredient_status_v1";

export const INGREDIENT_STATUS_CHANGED_EVENT_NAME = "weaning_ingredient_status_changed";
function notifyChanged() {
  // profileStore と同じ理由でディスパッチをマイクロタスクまで遅延させる。
  queueMicrotask(() => window.dispatchEvent(new Event(INGREDIENT_STATUS_CHANGED_EVENT_NAME)));
}

function readAll(): Record<string, IngredientStatus> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, IngredientStatus>;
  } catch {
    return {};
  }
}

function writeAll(statuses: Record<string, IngredientStatus>): void {
  localStorage.setItem(KEY, JSON.stringify(statuses));
  notifyChanged();
}

export function loadIngredientStatuses(): Record<string, IngredientStatus> {
  return readAll();
}

export function setIngredientStatus(
  ingredientId: string,
  status: IngredientStatusValue,
  notes?: string
): void {
  const all = readAll();
  const entry: IngredientStatus = { status, notes, updatedAt: Date.now() };
  all[ingredientId] = entry;
  writeAll(all);
  void syncIngredientStatusToCloud(ingredientId, entry).catch((e) =>
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
