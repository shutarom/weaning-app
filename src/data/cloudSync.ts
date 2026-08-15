import {
  doc, setDoc, collection, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, type FirestoreError,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getHouseholdId } from "../lib/householdState";
import { getBabyId } from "../lib/babyState";
import { getDeviceId } from "../lib/deviceId";
import type { Allergen, BabyProfile, DailyLog, DailyPlan, IngredientStatus } from "../domain/types";

function activeContext() {
  const hid = getHouseholdId();
  const babyId = getBabyId();
  if (!hid || !babyId) return null;
  const uid = auth.currentUser?.uid ?? getDeviceId();
  return { hid, babyId, uid };
}

function babyDoc(hid: string, babyId: string, ...path: string[]) {
  return doc(db, "households", hid, "babies", babyId, ...path);
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

// ===== 書き込みの失敗を画面に出すための仕組み =====
//
// 以前は書き込みの失敗が .catch(console.error) で握り潰されており、同期バッジは
// 購読(読み取り)のエラーしか見ていなかった。そのため「読み取りは通るが書き込みだけ
// permission-denied」という状態だと、バッジは正常のまま記録がクラウドに一切
// 上がらない、という無言の同期停止が起きていた。書き込み側の状態もここで集約する。

export const SYNC_WRITE_STATUS_EVENT = "weaning_sync_write_status";

let writeStatus: SyncStatus | null = null;

/** 直近の書き込みが失敗していれば、その状態を返す。正常なら null。 */
export function getWriteStatus(): SyncStatus | null {
  return writeStatus;
}

function setWriteStatus(next: SyncStatus | null) {
  if (writeStatus === next) return;
  writeStatus = next;
  queueMicrotask(() => window.dispatchEvent(new Event(SYNC_WRITE_STATUS_EVENT)));
}

/**
 * クラウドへの書き込みを実行し、成否を同期状態へ反映する。
 * 呼び出し側が握り潰しても、失敗したことは画面に残る。
 */
async function runWrite(op: () => Promise<void>): Promise<void> {
  try {
    await op();
    setWriteStatus(null);
  } catch (e) {
    const code = (e as FirestoreError)?.code;
    // オフライン時はSDKがローカルにキューして後で送るため、異常として扱わない。
    // permission-denied は放置すると永久に同期されないので必ず表面化させる。
    if (code === "permission-denied") setWriteStatus("permission_error");
    else if (code) setWriteStatus("offline");
    throw e;
  }
}

// ===== 書き込み =====
// households/{hid}/babies/{babyId}/... 配下に書き込む。
// プロフィール(生年月日・アレルギー等)は babies/{babyId} ドキュメント自体が兼ねる
// （旧バージョンにあった専用の profile/baby サブコレクションは廃止）。

export async function syncLogToCloud(dateIso: string, log: DailyLog): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId, "logs", dateIso);
  await runWrite(() => setDoc(ref, stripUndefined({ ...log, dateIso, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true }));
}

export async function syncPlanToCloud(dateIso: string, plan: DailyPlan): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId, "plans", dateIso);
  await runWrite(() => setDoc(ref, stripUndefined({ ...plan, dateIso, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true }));
}

/**
 * プロフィールの部分更新。変更されたフィールドだけを送る（呼び出し側のローカルキャッシュが
 * 古い場合でも、他デバイスが更新した未変更フィールドを巻き戻さないため）。
 */
export async function syncProfilePatchToCloud(patch: Partial<BabyProfile>): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId);
  await runWrite(() => setDoc(ref, stripUndefined({ ...patch, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true }));
}

/** 切り替えずに任意のbabyIdの名前を変更する（スイッチャーUIから他の赤ちゃんを改名する用途） */
export async function renameBabyByIdInCloud(hid: string, babyId: string, name: string): Promise<void> {
  const ref = doc(db, "households", hid, "babies", babyId);
  await runWrite(() => setDoc(ref, { name, updatedAt: serverTimestamp() }, { merge: true }));
}

export async function addAllergyToCloud(name: string): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId);
  await runWrite(() => setDoc(
    ref,
    { allergies: arrayUnion(name), updatedAt: serverTimestamp(), updatedBy: ctx.uid },
    { merge: true }
  ));
}

export async function removeAllergyFromCloud(name: string): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId);
  // ドキュメントが存在しない可能性もあるため setDoc+merge ではなく updateDoc は使わず、
  // arrayRemove は存在しないドキュメントに対しても setDoc(merge) でも安全に無視される。
  await runWrite(() => setDoc(
    ref,
    { allergies: arrayRemove(name), updatedAt: serverTimestamp(), updatedBy: ctx.uid },
    { merge: true }
  ));
}

export async function addAllergenTagToCloud(tag: Allergen): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId);
  await runWrite(() => setDoc(
    ref,
    { allergenTags: arrayUnion(tag), updatedAt: serverTimestamp(), updatedBy: ctx.uid },
    { merge: true }
  ));
}

export async function removeAllergenTagFromCloud(tag: Allergen): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId);
  await runWrite(() => setDoc(
    ref,
    { allergenTags: arrayRemove(tag), updatedAt: serverTimestamp(), updatedBy: ctx.uid },
    { merge: true }
  ));
}

export async function syncIngredientStatusToCloud(
  ingredientId: string,
  entry: IngredientStatus
): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = babyDoc(ctx.hid, ctx.babyId, "ingredientStatus", ingredientId);
  await runWrite(() => setDoc(ref, stripUndefined({ ...entry, updatedAt: serverTimestamp(), updatedBy: ctx.uid }), { merge: true }));
}

// ===== リアルタイム購読 =====

export type SyncStatus = "connecting" | "synced" | "offline" | "permission_error";

function statusFromError(err: FirestoreError): SyncStatus {
  return err.code === "permission-denied" ? "permission_error" : "offline";
}

export function subscribeToCloud(
  hid: string,
  babyId: string,
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
    collection(db, "households", hid, "babies", babyId, "logs"),
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
    collection(db, "households", hid, "babies", babyId, "plans"),
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
  babyId: string,
  onData: (profile: BabyProfile | null) => void,
  onError?: (status: SyncStatus) => void
): () => void {
  return onSnapshot(
    doc(db, "households", hid, "babies", babyId),
    (snap) => onData(snap.exists() ? (snap.data() as BabyProfile) : null),
    (err) => { onData(null); onError?.(statusFromError(err)); }
  );
}

export function subscribeIngredientStatuses(
  hid: string,
  babyId: string,
  onData: (statuses: Record<string, IngredientStatus>) => void,
  onError?: (status: SyncStatus) => void
): () => void {
  return onSnapshot(
    collection(db, "households", hid, "babies", babyId, "ingredientStatus"),
    (snap) => {
      const statuses: Record<string, IngredientStatus> = {};
      snap.forEach((d) => { statuses[d.id] = d.data() as IngredientStatus; });
      onData(statuses);
    },
    (err) => { onData({}); onError?.(statusFromError(err)); }
  );
}
