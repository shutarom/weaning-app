/**
 * Android の Gboard では日本語変換を確定する Enter でも keydown が発火し、
 * key === "Enter" になる。ガードしないと変換確定のつもりの Enter が
 * 「送信」として拾われ、未確定の文字がそのまま登録されてしまう。
 *
 * nativeEvent.isComposing が正だが、古い Android WebView では未実装なので
 * IME 用の keyCode 229 も併せて見る。
 */
export function isImeComposing(e: React.KeyboardEvent): boolean {
  return e.nativeEvent.isComposing || e.keyCode === 229;
}

/** 変換確定の Enter を除外した「本物の Enter」判定 */
export function isCommitEnter(e: React.KeyboardEvent): boolean {
  return e.key === "Enter" && !isImeComposing(e);
}
