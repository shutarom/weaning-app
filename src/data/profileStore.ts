import type { Allergen, BabyProfile } from "../domain/types";
import {
  syncProfilePatchToCloud, addAllergyToCloud, removeAllergyFromCloud,
  addAllergenTagToCloud, removeAllergenTagFromCloud, toMillis,
} from "./cloudSync";
import { getBabyId } from "../lib/babyState";
import { safeGetItem, safeSetItem } from "../lib/storage";

// 赤ちゃんごとにローカルのプロフィールを分離する。
function storageKey(): string {
  return `weaning_profile_v1:${getBabyId() ?? "_"}`;
}
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
  return { birthdayIso: "", weaningStartIso: "", allergies: [], allergenTags: [] };
}

function migrateLegacy(): BabyProfile | null {
  const birthdayIso = safeGetItem(LEGACY_BIRTHDAY_KEY);
  if (!birthdayIso) return null;
  const weaningStartIso = safeGetItem(LEGACY_WEANING_START_KEY) ?? "";
  return { birthdayIso, weaningStartIso, allergies: [], allergenTags: [], updatedAt: Date.now() };
}

export function loadProfile(): BabyProfile {
  try {
    const raw = safeGetItem(storageKey());
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<BabyProfile>) };
  } catch {
    // fall through to legacy/empty
  }
  const legacy = migrateLegacy();
  if (legacy) {
    safeSetItem(storageKey(), JSON.stringify(legacy));
    return legacy;
  }
  return empty();
}

function writeLocal(profile: BabyProfile): void {
  safeSetItem(storageKey(), JSON.stringify(profile));
  notifyChanged();
}

/**
 * 変更されたフィールドだけをクラウドへ送る（丸ごと送信すると、他デバイスが
 * 直前に更新した未変更フィールドを、こちら側の古いローカルキャッシュの値で
 * 上書きしてしまうため）。ローカルキャッシュには表示用に全体をマージして保存する。
 * (Antigravity/agyとのレビューで指摘された「全体上書きによるフィールドのクロバー」対策)
 */
export function saveProfile(patch: Partial<BabyProfile>): void {
  const next: BabyProfile = { ...loadProfile(), ...patch, updatedAt: Date.now() };
  writeLocal(next);
  void syncProfilePatchToCloud(patch).catch((e) => console.error("syncProfilePatchToCloud failed", e));
}

export function addAllergy(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const local = loadProfile();
  if (local.allergies.includes(trimmed)) return;
  writeLocal({ ...local, allergies: [...local.allergies, trimmed], updatedAt: Date.now() });
  void addAllergyToCloud(trimmed).catch((e) => console.error("addAllergyToCloud failed", e));
}

export function removeAllergy(name: string): void {
  const local = loadProfile();
  writeLocal({ ...local, allergies: local.allergies.filter((a) => a !== name), updatedAt: Date.now() });
  void removeAllergyFromCloud(name).catch((e) => console.error("removeAllergyFromCloud failed", e));
}

export function addAllergenTag(tag: Allergen): void {
  const local = loadProfile();
  if (local.allergenTags.includes(tag)) return;
  writeLocal({ ...local, allergenTags: [...local.allergenTags, tag], updatedAt: Date.now() });
  void addAllergenTagToCloud(tag).catch((e) => console.error("addAllergenTagToCloud failed", e));
}

export function removeAllergenTag(tag: Allergen): void {
  const local = loadProfile();
  writeLocal({ ...local, allergenTags: local.allergenTags.filter((a) => a !== tag), updatedAt: Date.now() });
  void removeAllergenTagFromCloud(tag).catch((e) => console.error("removeAllergenTagFromCloud failed", e));
}

/** クラウドの方が新しければローカルへ反映する（Timestampと数値どちらでも比較できるよう正規化） */
export function mergeProfileFromCloud(cloud: BabyProfile | null): void {
  if (!cloud) return;
  const local = loadProfile();
  const cloudMillis = toMillis(cloud.updatedAt);
  if (cloudMillis > (local.updatedAt ?? 0)) {
    writeLocal({ ...empty(), ...cloud, updatedAt: cloudMillis });
  }
}
