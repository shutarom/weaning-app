import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  linkWithPopup,
  signOut,
  type AuthError,
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

// 匿名で自動サインイン（どのドメイン・IPでも動作する）
export async function ensureAnonymousAuth(): Promise<void> {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}

// Googleアカウントと連携（匿名→Google昇格）
export async function linkWithGoogle(): Promise<void> {
  if (!auth.currentUser) await signInAnonymously(auth);
  try {
    await linkWithPopup(auth.currentUser!, provider);
  } catch (e) {
    const code = (e as AuthError).code;
    if (code === "auth/popup-blocked" || code === "auth/popup-cancelled-by-user") {
      await signInWithRedirect(auth, provider);
    } else {
      throw e;
    }
  }
}

export async function loginWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as AuthError).code;
    if (code === "auth/popup-blocked" || code === "auth/popup-cancelled-by-user") {
      await signInWithRedirect(auth, provider);
    } else {
      throw e;
    }
  }
}

export async function logout() {
  await signOut(auth);
}
