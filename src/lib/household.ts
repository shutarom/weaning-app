import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { createBaby } from "./babies";
import { newLocalId } from "./compat";

function genHouseholdId() {
  return newLocalId(10);
}

export async function createHousehold(uid: string) {
  const hid = genHouseholdId();

  // schemaVersion: 2 = 複数の赤ちゃん(babies/{babyId})に対応した構造で作成する。
  // 移行が必要になるのは、これより前に作られた households のみ(babies.ts参照)。
  await setDoc(doc(db, "households", hid), {
    ownerUid: uid,
    createdAt: serverTimestamp(),
    schemaVersion: 2,
  });

  await setDoc(doc(db, "households", hid, "members", uid), {
    role: "owner",
    createdAt: serverTimestamp(),
  });

  await createBaby(hid, "赤ちゃん", 0);

  return hid;
}

export async function joinHousehold(hid: string, uid: string) {
  const snap = await getDoc(doc(db, "households", hid));
  if (!snap.exists()) throw new Error("その招待コードの家族が見つからない");

  await setDoc(doc(db, "households", hid, "members", uid), {
    role: "member",
    createdAt: serverTimestamp(),
  });

  return hid;
}
