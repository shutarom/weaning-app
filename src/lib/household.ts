import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

function genHouseholdId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function createHousehold(uid: string) {
  const hid = genHouseholdId();

  await setDoc(doc(db, "households", hid), {
    ownerUid: uid,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "households", hid, "members", uid), {
    role: "owner",
    createdAt: serverTimestamp(),
  });

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
