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

  // すでにメンバーなら書き込まない。
  //
  // メンバー文書は作成しか許可していない(firestore.rules)ため、既存メンバーが
  // 同じ招待コードで入り直すと setDoc が update と見なされて permission-denied になる。
  // 匿名認証のuidは端末に保持されるので、「同期エラー→再参加」で復旧しようとすると
  // 必ずこの経路に入り、復旧手段そのものが失敗していた。
  const memberRef = doc(db, "households", hid, "members", uid);
  const member = await getDoc(memberRef);
  if (member.exists()) return hid;

  await setDoc(memberRef, {
    role: "member",
    createdAt: serverTimestamp(),
  });

  return hid;
}
