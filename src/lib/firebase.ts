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

// ローカル開発時はreCAPTCHAが動かないドメインでも通せるよう、
// Firebase公式のデバッグトークン機構を使う（本番ビルドには影響しない）。
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
if (recaptchaSiteKey) {
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
