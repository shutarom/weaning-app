import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "./firebase";
import { ensureAnonymousAuth } from "./auth";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(
      auth,
      async (u) => {
        if (!alive) return;
        if (u) {
          setUser(u);
          setLoading(false);
        } else {
          // 未ログインなら匿名認証を自動実行
          try {
            await ensureAnonymousAuth();
          } catch {
            setLoading(false);
          }
        }
      },
      () => {
        if (!alive) return;
        setLoading(false);
      }
    );

    const watchdog = window.setTimeout(() => {
      if (!alive) return;
      setLoading(false);
    }, 10000);

    return () => {
      alive = false;
      unsub();
      window.clearTimeout(watchdog);
    };
  }, []);

  return { user, loading };
}
