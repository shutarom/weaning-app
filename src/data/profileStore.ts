import type { BabyProfile } from "../domain/types";
import { syncProfileToCloud } from "./cloudSync";

const KEY = "weaning_profile_v1";
// 旧バージョンのローカル専用キー（世帯同期がなかった頃の名残）。
// 新形式が空ならここから一度だけ移行する。
const LEGACY_BIRTHDAY_KEY = "weaning_birthday";
const LEGACY_WEANING_START_KEY = "weaning_start_date";

export const PROFILE_CHANGED_EVENT_NAME = "weaning_profile_changed";
function notifyChanged() {
  // FirestoreのonSnapshotコールバックなど、Reactの描画サイクルの外側から
  // 呼ばれる場合があるため、リスナー側のsetStateがレンダー中と衝突しないよう
  // 次のマイクロタスクまでディスパッチを遅らせる。
  queueMicrotask(() => window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT_NAME)));
}

function empty(): BabyProfile {
  return { birthdayIso: "", weaningStartIso: "", allergies: [] };
}

function migrateLegacy(): BabyProfile | null {
  const birthdayIso = localStorage.getItem(LEGACY_BIRTHDAY_KEY);
  if (!birthdayIso) return null;
  const weaningStartIso = localStorage.getItem(LEGACY_WEANING_START_KEY) ?? "";
  return { birthdayIso, weaningStartIso, allergies: [], updatedAt: Date.now() };
}

export function loadProfile(): BabyProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<BabyProfile>) };
  } catch {
    // fall through to legacy/empty
  }
  const legacy = migrateLegacy();
  if (legacy) {
    localStorage.setItem(KEY, JSON.stringify(legacy));
    return legacy;
  }
  return empty();
}

function writeLocal(profile: BabyProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
  notifyChanged();
}

export function saveProfile(patch: Partial<BabyProfile>): void {
  const next: BabyProfile = { ...loadProfile(), ...patch, updatedAt: Date.now() };
  writeLocal(next);
  void syncProfileToCloud(next).catch((e) => console.error("syncProfileToCloud failed", e));
}

/** クラウドの方が新しければローカルへ反映する */
export function mergeProfileFromCloud(cloud: BabyProfile | null): void {
  if (!cloud) return;
  const local = loadProfile();
  if ((cloud.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
    writeLocal({ ...empty(), ...cloud });
  }
}
