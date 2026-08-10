import { doc, setDoc, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getHouseholdId } from "../lib/householdState";
import { getDeviceId } from "../lib/deviceId";
import type { DailyLog, DailyPlan } from "../domain/types";

function activeContext() {
  const hid = getHouseholdId();
  if (!hid) return null;
  const uid = auth.currentUser?.uid ?? getDeviceId();
  return { hid, uid };
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ===== 書き込み =====

export async function syncLogToCloud(dateIso: string, log: DailyLog): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "logs", dateIso);
  await setDoc(ref, stripUndefined({ ...log, dateIso, updatedAt: Date.now(), updatedBy: ctx.uid }), { merge: true });
}

export async function syncPlanToCloud(dateIso: string, plan: DailyPlan): Promise<void> {
  const ctx = activeContext();
  if (!ctx) return;
  const ref = doc(db, "households", ctx.hid, "plans", dateIso);
  await setDoc(ref, stripUndefined({ ...plan, dateIso, updatedAt: Date.now(), updatedBy: ctx.uid }), { merge: true });
}

// ===== リアルタイム購読 =====

export type SyncStatus = "connecting" | "synced" | "offline";

export function subscribeToCloud(
  hid: string,
  onData: (logs: Record<string, DailyLog>, plans: Record<string, DailyPlan>) => void,
  onStatusChange: (status: SyncStatus) => void
): () => void {
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

  const handleError = () => onStatusChange("offline");

  const unsubLogs = onSnapshot(
    collection(db, "households", hid, "logs"),
    (snap) => {
      const logs: Record<string, DailyLog> = {};
      snap.forEach((d) => { logs[d.id] = d.data() as DailyLog; });
      state.logs = logs;
      state.logsReady = true;
      tryNotify();
    },
    handleError
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
    handleError
  );

  return () => { unsubLogs(); unsubPlans(); };
}
