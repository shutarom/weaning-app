import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "./firebase";
import { ensureAnonymousAuth } from "./auth";

const AUTH_TIMEOUT_MS = 15000;
const AUTH_FAILED_MESSAGE =
  "通信環境が不安定で、サインインを完了できませんでした。電波の良い場所で再読み込みしてください。";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  // 認証が終わらないまま先へ進むと Firestore が permission-denied になるだけなので、
  // 「黙って未認証で続行」ではなく画面にエラーを出して再読み込みを促す。
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    getRedirectResult(auth).catch(() => {});

    const finishWithError = (message: string) => {
      if (!alive) return;
      setError(message);
      setLoading(false);
    };

    const unsub = onAuthStateChanged(
      auth,
      async (u) => {
        if (!alive) return;
        if (u) {
          setUser(u);
          setError(null);
          setLoading(false);
        } else {
          // 未ログインなら匿名認証を自動実行
          try {
            await ensureAnonymousAuth();
          } catch (e) {
            finishWithError(e instanceof Error ? e.message : AUTH_FAILED_MESSAGE);
          }
        }
      },
      (e) => finishWithError(e instanceof Error ? e.message : AUTH_FAILED_MESSAGE)
    );

    const watchdog = window.setTimeout(() => {
      if (!alive || auth.currentUser) return;
      finishWithError(AUTH_FAILED_MESSAGE);
    }, AUTH_TIMEOUT_MS);

    return () => {
      alive = false;
      unsub();
      window.clearTimeout(watchdog);
    };
  }, []);

  return { user, loading, error };
}
