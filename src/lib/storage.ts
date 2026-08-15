/**
 * localStorage の薄いラッパー。
 *
 * Android Chrome では「サイトデータをブロック」設定・シークレットタブ・端末の
 * 容量逼迫などで setItem が SecurityError / QuotaExceededError を投げる。
 * 素で呼ぶと React のイベントハンドラ内から例外が飛び、後続のクラウド同期まで
 * 実行されないまま UI は成功したように見える（＝記録が黙って消える）。
 * ここで捕まえ、失敗したことを画面に出せるようイベントで通知する。
 */

export const STORAGE_ERROR_EVENT_NAME = "weaning_storage_error";

let currentError: string | null = null;

export function getStorageError(): string | null {
  return currentError;
}

function notify() {
  queueMicrotask(() => window.dispatchEvent(new Event(STORAGE_ERROR_EVENT_NAME)));
}

function describe(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return "端末の保存容量がいっぱいで、記録を保存できませんでした。不要なアプリのデータを削除してください。";
  }
  return "ブラウザの設定でこのサイトのデータ保存がブロックされているため、記録を保存できませんでした。シークレットモードを解除するか、サイトデータの保存を許可してください。";
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 保存できたら true。失敗しても例外は投げず、エラーバナー用の状態を更新する。 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    if (currentError !== null) {
      currentError = null;
      notify();
    }
    return true;
  } catch (e) {
    console.error("localStorage.setItem failed", key, e);
    currentError = describe(e);
    notify();
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error("localStorage.removeItem failed", key, e);
  }
}
