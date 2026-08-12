import {
  doc, setDoc, collection, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, type FirestoreError,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getHouseholdId } from "../lib/householdState";
import { getDeviceId } from "../lib/deviceId";
import type { BabyProfile, DailyLog, DailyPlan, IngredientStatus } from "../domain/types";

function activeContext() {
  const hid = getHouseholdId();
  if (!hid) return null;
  const uid = auth.currentUser?.uid ?? getDeviceId();
  return { hid, uid };
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Firestoreから読んだ updatedAt は serverTimestamp() 由来の Timestamp オブジェクト
 * （{ toMillis(): number }）で返ってくる。ローカルの Date.now() 由来の数値と混在するため、
 * 比較前にどちらもミリ秒の数値へ正規化する。書き込み直後のローカルエコーでは
 * サーバー確定前で null になることもあるため、その場合は 0 として「常にサーバー側を採用」しない
 * ようにする（呼び出し側で local を優先させる）。
 * (Antigravity/agyとのレビューで指摘されたクロックスキュー対策)
 */
export function toMillis(val: unknown): number {
  if (typeof val === "number") return val;
  if (val && typeof (val as { toMillis?: () => number }).toMillis === "function") {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

// ===== 書き込み =====

export async function syncLogToCloud(dateIso: string, log: DailyLog): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "logs", dateIso);
  await setDoc(ref, stripUndefined({ ...log, dateIso, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true });
}

export async function syncPlanToCloud(dateIso: string, plan: DailyPlan): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "plans", dateIso);
  await setDoc(ref, stripUndefined({ ...plan, dateIso, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true });
}

/**
 * プロフィールの部分更新。変更されたフィールドだけを送る（呼び出し側のローカルキャッシュが
 * 古い場合でも、他デバイスが更新した未変更フィールドを巻き戻さないため）。
 */
export async function syncProfilePatchToCloud(patch: Partial<BabyProfile>): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "profile", "baby");
  await setDoc(ref, stripUndefined({ ...patch, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true });
}

export async function addAllergyToCloud(name: string): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "profile", "baby");
  await setDoc(
    ref,
    { allergies: arrayUnion(name), updatedAt: serverTimestamp(), updatedBy: ctx.uid },
    { merge: true }
  );
}

export async function removeAllergyFromCloud(name: string): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "profile", "baby");
  // ドキュメントが存在しない可能性もあるため setDoc+merge ではなく updateDoc は使わず、
  // arrayRemove は存在しないドキュメントに対しては setDoc(merge) でも安全に無視される。
  await setDoc(
    ref,
    { allergies: arrayRemove(name), updatedAt: serverTimestamp(), updatedBy: ctx.uid },
    { merge: true }
  );
}

export async function syncIngredientStatusToCloud(
  ingredientId: string,
  entry: IngredientStatus
): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "ingredientStatus", ingredientId);
  await setDoc(ref, stripUndefined({ ...entry, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true });
}

// ===== リアルタイム購読 =====

export type SyncStatus = "connecting" | "synced" | "offline" | "permission_error";

function statusFromError(err: FirestoreError): SyncStatus {
  return err.code === "permission-denied" ? "permission_error" : "offline";
}

export function subscribeToCloud(
  hid: string,
  onData: (logs: Record<string, DailyLog>, plans: Record<string, DailyPlan>) => void,
  onStatusChange: (status: SyncStatus) => void
): () => void {
  onStatusChange("connecting");

  // 両コレクションが揃ってから onData を呼ぶ
  const state = {
    logs: {} as Record<string, DailyLog>,
    plans: {} as Record<string, DailyPlan>,
    logsReady: false,
    plansReady: false,
  };

  function tryNotify() {
    if (state.logsReady && state.plansReady) {
      onStatusChange("synced");
      onData(state.logs, state.plans);
    }
  }

  const unsubLogs = onSnapshot(
    collection(db, "households", hid, "logs"),
    (snap) => {
      const logs: Record<string, DailyLog> = {};
      snap.forEach((d) => { logs[d.id] = d.data() as DailyLog; });
      state.logs = logs;
      state.logsReady = true;
      tryNotify();
    },
    (err) => onStatusChange(statusFromError(err))
  );

  const unsubPlans = onSnapshot(
    collection(db, "households", hid, "plans"),
    (snap) => {
      const plans: Record<string, DailyPlan> = {};
      snap.forEach((d) => { plans[d.id] = d.data() as DailyPlan; });
      state.plans = plans;
      state.plansReady = true;
      tryNotify();
    },
    (err) => onStatusChange(statusFromError(err))
  );

  return () => { unsubLogs(); unsubPlans(); };
}

export function subscribeProfile(
  hid: string,
  onData: (profile: BabyProfile | null) => void,
  onError?: (status: SyncStatus) => void
): () => void {
  return onSnapshot(
    doc(db, "households", hid, "profile", "baby"),
    (snap) => onData(snap.exists() ? (snap.data() as BabyProfile) : null),
    (err) => { onData(null); onError?.(statusFromError(err)); }
  );
}

export function subscribeIngredientStatuses(
  hid: string,
  onData: (statuses: Record<string, IngredientStatus>) => void,
  onError?: (status: SyncStatus) => void
): () => void {
  return onSnapshot(
    collection(db, "households", hid, "ingredientStatus"),
    (snap) => {
      const statuses: Record<string, IngredientStatus> = {};
      snap.forEach((d) => { statuses[d.id] = d.data() as IngredientStatus; });
      onData(statuses);
    },
    (err) => { onData({}); onError?.(statusFromError(err)); }
  );
}
