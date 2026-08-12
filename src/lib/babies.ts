import {
  collection, doc, getDoc, getDocs, orderBy, query,
  runTransaction, serverTimestamp, setDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BabyProfile } from "../domain/types";

export type BabySummary = { id: string; name: string; order: number };

function genBabyId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function createBaby(hid: string, name: string, order: number): Promise<string> {
  const babyId = genBabyId();
  await setDoc(doc(db, "households", hid, "babies", babyId), {
    name,
    birthdayIso: "",
    weaningStartIso: "",
    allergies: [],
    allergenTags: [],
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return babyId;
}

/**
 * 指定babyIdのプロフィール全体(babies/{babyId}ドキュメント自体)を取得する。
 * babyId切り替え直後はローカルキャッシュがまだ空(そのbabyId用のlocalStorageキーを
 * 一度も書いたことがない)なため、Firestoreのリアルタイム購読が最初のスナップショットを
 * 受け取るまでの間、生年月日などが未設定に見えてしまう。呼び出し側でこれを
 * mergeProfileFromCloudに渡し、画面を出す前にローカルキャッシュを温めておくために使う。
 */
export async function getBabyProfile(hid: string, babyId: string): Promise<(BabyProfile & { name: string }) | null> {
  const snap = await getDoc(doc(db, "households", hid, "babies", babyId));
  if (!snap.exists()) return null;
  return snap.data() as BabyProfile & { name: string };
}

export async function listBabies(hid: string): Promise<BabySummary[]> {
  const snap = await getDocs(query(collection(db, "households", hid, "babies"), orderBy("order")));
  return snap.docs.map((d) => {
    const data = d.data() as Partial<BabyProfile & { name: string; order: number }>;
    return { id: d.id, name: data.name || "赤ちゃん", order: data.order ?? 0 };
  });
}

const CHUNK = 400;

async function copySubcollection(hid: string, subcollection: string, babyId: string): Promise<void> {
  const snap = await getDocs(collection(db, "households", hid, subcollection));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + CHUNK)) {
      batch.set(doc(db, "households", hid, "babies", babyId, subcollection, d.id), d.data());
    }
    await batch.commit();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 単一の赤ちゃんを前提にしていた旧データ構造(households/{hid}/logs 等)から、
 * 複数の赤ちゃんに対応した households/{hid}/babies/{babyId}/logs 等へ移行する。
 * schemaVersionが既に2なら何もしない。複数端末が同時に起動しても二重実行しないよう、
 * トランザクションで"migrating"状態を1台だけが取得できるようにしてから実データをコピーする。
 * 旧パスのデータは削除しない（万一の移行失敗時にも記録が失われないようにするため）。
 */
export async function migrateToMultiBabyIfNeeded(hid: string): Promise<void> {
  const hRef = doc(db, "households", hid);

  const claim = await runTransaction(db, async (tx) => {
    const snap = await tx.get(hRef);
    const schemaVersion = snap.data()?.schemaVersion;
    if (schemaVersion === 2) return "done" as const;
    if (schemaVersion === "migrating") return "in_progress" as const;
    tx.set(hRef, { schemaVersion: "migrating" }, { merge: true });
    return "claimed" as const;
  });

  if (claim === "done") return;

  if (claim === "in_progress") {
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const snap = await getDoc(hRef);
      if (snap.data()?.schemaVersion === 2) return;
    }
    throw new Error("データ移行の完了を確認できませんでした。しばらくしてから再読み込みしてください");
  }

  // claim === "claimed"：このデバイスが移行を実施する
  try {
    const profileSnap = await getDoc(doc(db, "households", hid, "profile", "baby"));
    const profile = profileSnap.exists() ? (profileSnap.data() as Partial<BabyProfile>) : {};
    const babyId = genBabyId();
    await setDoc(doc(db, "households", hid, "babies", babyId), {
      name: "赤ちゃん",
      birthdayIso: profile.birthdayIso ?? "",
      weaningStartIso: profile.weaningStartIso ?? "",
      allergies: profile.allergies ?? [],
      allergenTags: profile.allergenTags ?? [],
      order: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await copySubcollection(hid, "logs", babyId);
    await copySubcollection(hid, "plans", babyId);
    await copySubcollection(hid, "ingredientStatus", babyId);
    await setDoc(hRef, { schemaVersion: 2 }, { merge: true });
  } catch (e) {
    console.error("[migrateToMultiBabyIfNeeded] migration failed, rolling back to unmigrated state:", e);
    // 再試行できるよう未移行の状態に戻す（"migrating"のまま固まらないようにする）
    await setDoc(hRef, { schemaVersion: 1 }, { merge: true }).catch((e2) => {
      console.error("[migrateToMultiBabyIfNeeded] rollback also failed:", e2);
    });
    throw e;
  }
}
