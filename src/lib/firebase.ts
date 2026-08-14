import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAI, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// App Checkは本番ビルドのみ有効化する。ローカル開発でreCAPTCHA v3を通すには
// デバッグトークンをFirebase Consoleへ毎回手動登録する必要があり実用的でない上、
// 未登録のまま有効化しているとFirestoreへの読み書きがサイレントに失敗し続ける
// （実際にこのセッション中、複数回この問題で開発が止まった）。本番のHostingドメインでは
// 通常のreCAPTCHA v3検証がデバッグトークン無しで自動的に機能するため、開発時は
// App Check自体を初期化しない。
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
if (!import.meta.env.DEV && recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
export const db = getFirestore(app);
// Gemini Developer API 経由（Sparkプランのままで利用可、Cloud Functions不要）
export const ai = getAI(app, { backend: new GoogleAIBackend() });
