import { useEffect, useRef, useState } from "react";

/**
 * Android の Gboard で日本語入力しても壊れないテキスト入力。
 *
 * 元の実装は onChange のたびに localStorage 全体を書き換え、window イベントで
 * App 全体を再描画し、Firestore にも書き込んでいた。その結果、変換中
 * (composition 中) の input に外から value が再代入され、Gboard では未確定文字が
 * 消える・重複する・入れ替わるという症状が出る（PC Chrome や iOS の IME は
 * この再代入に耐えるため、Android でだけ再現する）。
 *
 * ここでは編集中の値をローカル state に持ち、
 *   - composition 中・フォーカス中は外部からの value を取り込まない
 *   - 未保存の変更が残っている間も取り込まない（focus/composition イベントを
 *     取りこぼす端末があるため、これを最後の砦にする）
 *   - 保存は blur・入力停止から一定時間後・ページ離脱時のみ
 * とすることで、入力中の DOM を触るのは利用者だけという状態を保つ。
 */

const COMMIT_DEBOUNCE_MS = 800;

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onBlur" | "onFocus"
> & {
  value: string;
  /** 実際に永続化するときだけ呼ばれる（打鍵ごとには呼ばれない） */
  onCommit: (value: string) => void;
};

export function TextField({ value, onCommit, ...rest }: Props) {
  const [draft, setDraft] = useState(value);
  // 直近で外部から取り込んだ値。draft と違えば「未保存の編集が残っている」。
  const [syncedValue, setSyncedValue] = useState(value);
  // フォーカス中または変換中。レンダー中に判定に使うので ref ではなく state。
  const [editing, setEditing] = useState(false);

  const composing = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // タイマーやページ離脱時のハンドラから同期的に読むための写し。
  // レンダー中には参照しない（読むのはイベントハンドラと effect の中だけ）。
  const draftRef = useRef(draft);
  const committedRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    draftRef.current = draft;
    committedRef.current = syncedValue;
    onCommitRef.current = onCommit;
  });

  // 外部（他端末からの同期など）で値が変わったときだけ取り込む。
  // React が推奨する「レンダー中に props から state を調整する」形。
  if (value !== syncedValue) {
    setSyncedValue(value);
    const dirty = draft !== syncedValue;
    if (!editing && !dirty) setDraft(value);
  }

  const setDraftValue = (v: string) => {
    draftRef.current = v;
    setDraft(v);
  };

  const flush = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (draftRef.current === committedRef.current) return;
    committedRef.current = draftRef.current;
    onCommitRef.current(draftRef.current);
  };

  const scheduleCommit = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, COMMIT_DEBOUNCE_MS);
  };

  // Android の PWA はバックグラウンドに回された時点で破棄されうるので、
  // 離脱前に未保存の入力を書き出す。
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, []);

  return (
    <input
      {...rest}
      value={draft}
      onFocus={() => setEditing(true)}
      onCompositionStart={() => {
        composing.current = true;
        setEditing(true);
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        // 変換が終わってもフォーカスが残っていれば編集中のまま。
        // focus/blur が飛んでこない端末で editing が立ちっぱなしになり、
        // 他端末からの更新を受け取れなくなるのを防ぐ。
        setEditing(e.currentTarget === document.activeElement);
        setDraftValue(e.currentTarget.value);
        scheduleCommit();
      }}
      onChange={(e) => {
        setDraftValue(e.target.value);
        // 変換確定前に保存するとクラウド同期が割り込んで値が戻るため、
        // composition 中はタイマーすら回さない。
        if (!composing.current) scheduleCommit();
      }}
      onBlur={() => {
        composing.current = false;
        setEditing(false);
        flush();
      }}
    />
  );
}
