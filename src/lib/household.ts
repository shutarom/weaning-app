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
  // メンバー文書の更新は role を変えない場合しか許可していない(firestore.rules)ため、
  // 既存メンバーが同じ招待コードで入り直すと setDoc が update と見なされる。
  // 匿名認証のuidは端末に保持されるので、「同期エラー→再参加」で復旧しようとすると
  // 必ずこの経路に入る。
  //
  // この存在確認自体が失敗しても参加を止めないこと。ルールの反映待ちなどで
  // 読めない状況はありうるが、そこで例外を投げると新しい端末が参加できなくなる。
  const memberRef = doc(db, "households", hid, "members", uid);
  let alreadyMember = false;
  try {
    alreadyMember = (await getDoc(memberRef)).exists();
  } catch {
    alreadyMember = false; // 判断できないときは作成を試みる
  }
  if (alreadyMember) return hid;

  await setDoc(memberRef, {
    role: "member",
    createdAt: serverTimestamp(),
  });

  return hid;
}
