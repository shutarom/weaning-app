/**
 * secure context (https / localhost) でしか使えない Web API のフォールバック。
 *
 * 本番の Firebase Hosting は https なので問題ないが、実機 Android で
 * `npm run dev -- --host` して http://192.168.x.x を開くと crypto.randomUUID も
 * navigator.clipboard も undefined になり、オンボーディングが真っ白になったり
 * コピーボタンで TypeError になったりして実機デバッグが成立しない。
 */

/** ID生成。crypto.randomUUID が無い環境では getRandomValues → Math.random と段階的に落とす。 */
export function newLocalId(length: number): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    return c.randomUUID().replace(/-/g, "").slice(0, length);
  }
  if (typeof c?.getRandomValues === "function") {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
  }
  let out = "";
  while (out.length < length) out += Math.random().toString(16).slice(2);
  return out.slice(0, length);
}

/** クリップボードへコピー。成功したら true。例外は投げない。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 権限拒否など。下の execCommand フォールバックを試す。
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Blob をファイルとしてダウンロードさせる。
 * Android Chrome は a.click() の直後に revokeObjectURL するとダウンロードが
 * 始まる前に URL が無効化されて失敗するため、解放を遅らせる。
 * アンカーを DOM に挿入しないと動かないブラウザもあるので挿入してから click する。
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
